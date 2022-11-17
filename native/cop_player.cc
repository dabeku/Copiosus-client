#include "cop_player.h"

#include "bridge.h"
#include "copiosus.h"
#include "cop_utility.h"
#include "cop_status_code.h"
#include "cop_state.h"
#include "cop_list.h"
#include "cop_network.h"

#include <stdlib.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#ifdef _WIN32
    // Windows
    #include <winsock2.h>
#else
    // Mac
    #include <arpa/inet.h>
#endif

#define USE_PROXY 1

#define MAX_VIDEOQ_SIZE (5 * 256 * 1024)

#define MAX_AUDIO_FRAME_SIZE 192000

#define AUDIO_FORMAT AUDIO_S16SYS

static const char* LOCALHOST_IP = "127.0.0.1";
static const char* FFMPEG_OPTIONS = "?overrun_nonfatal=1";

// A global audio open flag (we only want to open it once)
static bool isAudioOpen = false;
static int lastAudioDeviceId = 0;

static struct list_item* list_video_state = NULL;

static int decode_video(AVCodecContext *avctx, AVFrame *frame, int *got_frame, AVPacket *pkt) {
    return decode(avctx, frame, pkt, got_frame);
}

static int decode_audio(AVCodecContext *avctx, AVFrame *frame, int *got_frame, AVPacket *pkt) {
    return decode(avctx, frame, pkt, got_frame);
}

static void packet_queue_init(PacketQueue *q) {
    memset(q, 0, sizeof(PacketQueue));
    q->mutex = SDL_CreateMutex();
    q->cond = SDL_CreateCond();
}

static int packet_queue_get(PacketQueue *q, AVPacket *pkt, int block) {
    
    PacketList *pkt1 = NULL;
    int ret = 0;
    
    SDL_LockMutex(q->mutex);
    
    while(true) {
        if (quit == 1) {
            cop_debug("[packet_queue_get] Quit.");
            ret = -1;
            break;
        }
        pkt1 = q->first_pkt;
        if (pkt1) {
            q->first_pkt = pkt1->next;
            if (!q->first_pkt)
                q->last_pkt = NULL;
            q->nb_packets--;
            q->size -= pkt1->pkt.size;
            *pkt = pkt1->pkt;
            av_free(pkt1);
            ret = 1;
            break;
        } else if (!block) {
            ret = 0;
            break;
        } else {
            SDL_CondWait(q->cond, q->mutex);
        }
    }
    SDL_UnlockMutex(q->mutex);
    return ret;
}

static int packet_queue_put(PacketQueue *q, AVPacket *pkt) {
    
    PacketList *pkt1;

    pkt1 = (PacketList*)av_malloc(sizeof(PacketList));
    if (!pkt1)
        return -1;
    pkt1->pkt = *pkt;
    pkt1->next = NULL;
    
    SDL_LockMutex(q->mutex);
    
    if (!q->last_pkt)
        q->first_pkt = pkt1;
    else
        q->last_pkt->next = pkt1;
    q->last_pkt = pkt1;
    q->nb_packets++;
    q->size += pkt1->pkt.size;

    SDL_CondSignal(q->cond);
    SDL_UnlockMutex(q->mutex);
    return 0;
}

static void audio_callback(void *userdata, Uint8 *stream, int len) {
    
    //SDL 2.0
    SDL_memset(stream, 0, len);
    
    VideoState *is = (VideoState *)userdata;
    int got_frame = 0;
    AVPacket *packet = &is->audio_pkt;
    
    int ret = packet_queue_get(&is->audioq, packet, 0);
    if (ret < 0) {
        cop_error("[audio_callback] Error.");
        return;
    }
    if (ret == 0) {
        // This happens if audio is open but no data available
        //cop_error("[audio_callback] Ignore packet.");
        return;
    }
    
    AVFrame *pFrame = &is->audio_frame;
    
    ret = decode_audio( is->audio_ctx, &is->audio_frame, &got_frame, packet);

    if (ret < 0) {
        cop_error("[audio_callback] Error in decoding audio frame.");
        av_packet_unref(packet);
        return;
    }
    
    uint8_t *audio_buf = is->audio_buf;

    //cop_debug("[audio_callback] PTS (audio): %lld.", pFrame->pts);
    ret = swr_convert(
        is->au_convert_ctx,
        &audio_buf,
        MAX_AUDIO_FRAME_SIZE,
        (const uint8_t **)pFrame->data,
        pFrame->nb_samples);

    // Do not use SDL_MixAudio() here since the sound will be muted
    //SDL_MixAudio(stream, (uint8_t *)is->audio_buf, len, SDL_MIX_MAXVOLUME);
    SDL_MixAudioFormat(stream, (uint8_t *)is->audio_buf, AUDIO_FORMAT, len, SDL_MIX_MAXVOLUME);
    av_packet_unref(packet);
}

int frame_to_jpeg(VideoState *is, AVFrame *frame) {

    AVFrame* pFrameRGB = av_frame_alloc();
    int numBytesRGB = av_image_get_buffer_size(
                                        AV_PIX_FMT_RGB24,
                                        is->video_ctx->width,
                                        is->video_ctx->height, 32);

    uint8_t *bufferRGB = (uint8_t *)av_malloc(numBytesRGB*sizeof(uint8_t));
    av_image_fill_arrays (pFrameRGB->data, pFrameRGB->linesize, bufferRGB, AV_PIX_FMT_RGB24, is->video_ctx->width, is->video_ctx->height, 1);
    
    sws_scale(is->sws_ctx, (uint8_t const * const *) frame->data,
                frame->linesize, 0, is->video_ctx->height, pFrameRGB->data,
                pFrameRGB->linesize);

    // Create copy of content
    u_int8_t* s = (u_int8_t*)malloc(3 * is->width * is->height);
    memcpy(s, pFrameRGB->data[0], 3 * is->width * is->height);
    update_frame(strdup(is->deviceId), s, is->width, is->height);

    // Attention: free(s) is called in update_frame() function since it's async

    av_frame_free(&pFrameRGB);
    av_free(bufferRGB);

    return 0;
}

static int video_thread(void *arg) {

    VideoState *is = (VideoState *)arg;
    AVFrame *pFrame = NULL;
    AVPacket pkt1;
    AVPacket *packet = &pkt1;
    int frameFinished = 0;
    
    // Allocate video frame
    pFrame = av_frame_alloc();
    
    while(true) {

        if (quit == 1) {
            break;
        }

        if(packet_queue_get(&is->videoq, packet, 1) < 0) {
            cop_error("[video_thread] We quit getting packages.");
            // Means we quit getting packets
            break;
        }
        int ret = decode_video(is->video_ctx, pFrame, &frameFinished, packet);
        if (ret < 0) {
            cop_error("[video_thread] Error in decoding video frame.");
            av_packet_unref(packet);
            continue;
        }
        
        // Did we get a video frame?
        if (frameFinished) {
            frame_to_jpeg(is, pFrame);
        } else {
            cop_debug("[video_thread] Frame is NOT finished.");
            update_status(strdup(is->deviceId), strdup("WAIT_FOR_FRAME"));
        }
        
        av_packet_unref(packet);
    }
    av_frame_free(&pFrame);
    return 0;
}

static int stream_component_open(VideoState *is, int stream_index) {
    cop_debug("[stream_component_open] Open stream: %d", stream_index);

    AVFormatContext *pFormatCtx = is->pFormatCtx;
    AVCodecContext *pCodecCtx = NULL;
    const AVCodec *codec = NULL;
    
    if (stream_index < 0 || stream_index >= (int)pFormatCtx->nb_streams) {
        cop_error("[stream_component_open] Invalid stream index.");
        return STATUS_CODE_PLAYER_STREAM_INVALID_INDEX;
    }
    
    cop_debug("[stream_component_open] Calling avcodec_find_decoder().");
    codec = avcodec_find_decoder(pFormatCtx->streams[stream_index]->codecpar->codec_id);
    if (!codec) {
        cop_error("[stream_component_open] Can't find codec.");
        return STATUS_CODE_PLAYER_STREAM_CANT_FIND_CODEC;
    }
    
    cop_debug("[stream_component_open] Calling avcodec_alloc_context3().");
    pCodecCtx = avcodec_alloc_context3(codec);
    if (avcodec_parameters_to_context(pCodecCtx, pFormatCtx->streams[stream_index]->codecpar) < 0) {
        cop_error("[stream_component_open] Failed to copy codec parameters to decoder context.");
        return STATUS_CODE_PLAYER_STREAM_CANT_COPY_CODEC;
    }
    
    if (pCodecCtx->codec_type == AVMEDIA_TYPE_AUDIO) {
        cop_debug("[stream_component_open] Setup audio codec.");
        // We want:
        // * Stereo output (= 2 channels)
        uint64_t out_channel_layout = AV_CH_LAYOUT_STEREO;
        int out_channels=av_get_channel_layout_nb_channels(out_channel_layout);
        // * Sample rate: 44100
        int out_sample_rate=44100;
        // * Samples: AAC-1024 MP3-1152
        int out_nb_samples=pCodecCtx->frame_size;

        if (isAudioOpen) {
            cop_debug("[stream_component_open] Close audio so we can use new one.");
            SDL_CloseAudioDevice(lastAudioDeviceId);
            isAudioOpen = false;
        }

        if (!isAudioOpen) {
            SDL_AudioSpec wanted_spec;
            SDL_AudioSpec spec;
            SDL_memset(&wanted_spec, 0, sizeof(wanted_spec));
            wanted_spec.freq = out_sample_rate;
            wanted_spec.format = AUDIO_FORMAT;
            wanted_spec.channels = out_channels;
            wanted_spec.silence = 0;
            wanted_spec.samples = out_nb_samples;
            wanted_spec.callback = audio_callback;
            wanted_spec.userdata = is;
            
            /*if (SDL_OpenAudio(&wanted_spec, &spec) < 0) {
                cop_error("[stream_component_open] Can't open SDL Audio: %s.", SDL_GetError());
                return STATUS_CODE_PLAYER_STREAM_CANT_OPEN_AUDIO;
            }*/

            // Returns a valid device ID that is > 0 on success or 0 on failure
            lastAudioDeviceId = SDL_OpenAudioDevice(NULL, 0, &wanted_spec, &spec, SDL_AUDIO_ALLOW_ANY_CHANGE);
            cop_debug("[stream_component_open] Device id: %d.", lastAudioDeviceId);
            if (lastAudioDeviceId == 0) {
                cop_error("[stream_component_open] Failed to open audio: %s.", SDL_GetError());
                return STATUS_CODE_PLAYER_STREAM_CANT_OPEN_AUDIO;
            } else {
                if (spec.format != wanted_spec.format) {
                    cop_error("[stream_component_open] We didn't get Float32 audio format.");
                }
                // Start audio playing
                SDL_PauseAudioDevice(lastAudioDeviceId, 0);
            }
            isAudioOpen = true;
        }
    }

    cop_debug("[stream_component_open] Calling avcodec_open2().");
    if (avcodec_open2(pCodecCtx, codec, NULL) < 0) {
        cop_error("[stream_component_open] Can't open codec.");
        return STATUS_CODE_PLAYER_STREAM_CANT_OPEN_CODEC;
    }
    
    switch(pCodecCtx->codec_type) {
        case AVMEDIA_TYPE_AUDIO:
            is->audio_st = pFormatCtx->streams[stream_index];
            is->audio_ctx = pCodecCtx;
            is->audio_buf_size = 0;
            is->audio_buf_index = 0;
            memset(&is->audio_pkt, 0, sizeof(is->audio_pkt));
            packet_queue_init(&is->audioq);
            SDL_PauseAudio(0);
            break;
        case AVMEDIA_TYPE_VIDEO:
            if (pCodecCtx->width == 0 || pCodecCtx->height == 0) {
                cop_error("[stream_component_open] Can't find codec information: width and height.");
                return STATUS_CODE_PLAYER_STREAM_MISSING_CODEC_INFO;
            }
            is->video_st = pFormatCtx->streams[stream_index];
            is->video_ctx = pCodecCtx;
            packet_queue_init(&is->videoq);
            is->video_tid = SDL_CreateThread(video_thread, "video_thread", is);
            is->sws_ctx = sws_getContext(is->video_ctx->width, is->video_ctx->height,
                                         is->video_ctx->pix_fmt, is->video_ctx->width,
                                         is->video_ctx->height, AV_PIX_FMT_RGB24,
                                         SWS_BILINEAR, NULL, NULL, NULL
                                         );
            break;
        default:
            break;
    }
    
    return STATUS_CODE_OK;
}

static int interrupt_cb(void *ctx) {
    VideoState* videoState = (VideoState*)ctx;
    if (videoState->isStopped == true) {
        cop_debug("[interrupt_cb] Stop due to interrupt poll.");
        // return 1 to abort the block operation of av_read_frame()
        return 1;
    }
    return 0;
}

int decode_thread_cam(void *arg) {
    cop_debug("[decode_thread_cam].");
    
    // Hold the status of the last function call
    int result = 0;
    
    VideoState *is = (VideoState *)arg;
    AVFormatContext *pFormatCtx = NULL;
    AVPacket pkt1;
    AVPacket *packet = &pkt1;
    
    int video_index = -1;
    unsigned int i = 0;
    
    int isInitialized = 0;

    while (isInitialized == 0) {
        
        if (quit == 1) {
            cop_debug("[decode_thread_cam] Quit (context not available).");
            break;
        }

        cop_debug("[decode_thread_cam] Start initialization with mpegts.");
        
        const AVInputFormat *inputFormat = av_find_input_format("mpegts");

        const char* url = "udp://";

        if (USE_PROXY) {
            url = concat(url, LOCALHOST_IP);
            url = concat(url, ":");
            url = concat(url, int_to_str(is->listen_port_cam + 1000));
            url = concat(url, FFMPEG_OPTIONS);
        } else {
            url = concat(url, is->listen_ip);
            url = concat(url, ":");
            url = concat(url, int_to_str(is->listen_port_cam));
            url = concat(url, FFMPEG_OPTIONS);
        }

        pFormatCtx = avformat_alloc_context();
        pFormatCtx->interrupt_callback.callback = interrupt_cb;
        pFormatCtx->interrupt_callback.opaque = is;

        cop_debug("[decode_thread_cam] Calling avformat_open_input() with %s.", url);
        result = avformat_open_input(&pFormatCtx, url, inputFormat, NULL);
        if (result != 0) {
            cop_error("[decode_thread_cam] Error: Can't open input.");
            return STATUS_CODE_PLAYER_CANT_OPEN_INPUT;
        }
        cop_debug("[decode_thread_cam] Successfully opened input stream.");
        
        is->pFormatCtx = pFormatCtx;
        
        cop_debug("[decode_thread_cam] Calling avformat_find_stream_info().");
        // Retrieve stream information
        result = avformat_find_stream_info(pFormatCtx, NULL);
        if (result < 0) {
            cop_error("[decode_thread_cam] Error: Can't find stream information.");
            return STATUS_CODE_PLAYER_CANT_FIND_STREAM_INFO;
        }
        cop_debug("[decode_thread_cam] Successfully got stream information.");
        
        av_dump_format(pFormatCtx, 0, url, 0);
        
        cop_debug("[decode_thread_cam] Format name: %s.", pFormatCtx->iformat->name);
        
        // Find the first video stream
        video_index = -1;
        for (i = 0; i < pFormatCtx->nb_streams; i++) {
            if (pFormatCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO &&
                video_index < 0) {
                video_index = i;
            }
        }
        
        /*
         * stream_component_open() start
         */
        cop_debug("[decode_thread_cam] Video stream index: %d.", video_index);
        
        if (video_index < 0) {
            cop_error("[decode_thread_cam] Could not find a video stream.");
            avformat_close_input(&pFormatCtx);
            continue;
        }
        
        result = stream_component_open(is, video_index);
        if (result < 0) {
            cop_error("[decode_thread_cam] Could not open video: %d.", result);
            avformat_close_input(&pFormatCtx);
            continue;
        }

        // We have all we need
        isInitialized = 1;
        
        avformat_flush(is->pFormatCtx);
        
        packet = (AVPacket*)av_malloc(sizeof(AVPacket));
        
        avformat_flush(is->pFormatCtx);
        
        while (true) {
            if (quit == 1) {
                cop_debug("[decode_thread_cam] Quit (context available).");
                break;
            }
            // Seek stuff goes here
            if (is->videoq.size > MAX_VIDEOQ_SIZE) {
                SDL_Delay(10);
                continue;
            }

            if (av_read_frame(is->pFormatCtx, packet) < 0) {
                if(is->pFormatCtx->pb->error == 0) {
                    SDL_Delay(100);
                    continue;
                } else {
                    break;
                }
            }
            // Is this a packet from the video stream?
            if (packet->stream_index == video_index) {
                packet_queue_put(&is->videoq, packet);
            } else {
                av_packet_unref(packet);
            }
        }

        cop_debug("[decode_thread_cam] Close input and free port.");
        avformat_close_input(&pFormatCtx);
    }
    return STATUS_CODE_OK;
}

int decode_thread_mic(void *arg) {
    cop_debug("[decode_thread_mic].");
    
    // Hold the status of the last function call
    int result = 0;
    
    VideoState *is = (VideoState *)arg;
    AVFormatContext *pFormatCtx = NULL;
    AVPacket pkt1;
    AVPacket *packet = &pkt1;
    
    int audio_index = -1;
    unsigned int i = 0;
    
    int isInitialized = 0;

    while (isInitialized == 0) {
        
        if (quit == 1) {
            cop_debug("[decode_thread_mic] Quit (context not available).");
            break;
        }

        cop_debug("[decode_thread_mic] Start initialization with mpegts.");
        
        const AVInputFormat *inputFormat = av_find_input_format("mpegts");

        const char* url = "udp://";

        if (USE_PROXY) {
            url = concat(url, LOCALHOST_IP);
            url = concat(url, ":");
            url = concat(url, int_to_str(is->listen_port_mic + 1000));
            url = concat(url, FFMPEG_OPTIONS);
        } else {
            url = concat(url, is->listen_ip);
            url = concat(url, ":");
            url = concat(url, int_to_str(is->listen_port_mic));
            url = concat(url, FFMPEG_OPTIONS);
        }

        pFormatCtx = avformat_alloc_context();
        pFormatCtx->interrupt_callback.callback = interrupt_cb;
        pFormatCtx->interrupt_callback.opaque = is;

        cop_debug("[decode_thread_mic] Calling avformat_open_input() with %s.", url);
        result = avformat_open_input(&pFormatCtx, url, inputFormat, NULL);
        if (result != 0) {
            cop_error("[decode_thread_mic] Error: Can't open input.");
            return STATUS_CODE_PLAYER_CANT_OPEN_INPUT;
        }
        cop_debug("[decode_thread_mic] Successfully opened input stream.");
        
        is->pFormatCtx = pFormatCtx;
        
        cop_debug("[decode_thread_mic] Calling avformat_find_stream_info().");
        // Retrieve stream information
        result = avformat_find_stream_info(pFormatCtx, NULL);
        if (result < 0) {
            cop_error("[decode_thread_mic] Error: Can't find stream information.");
            return STATUS_CODE_PLAYER_CANT_FIND_STREAM_INFO;
        }
        cop_debug("[decode_thread_mic] Successfully got stream information.");
        
        av_dump_format(pFormatCtx, 0, url, 0);
        
        cop_debug("[decode_thread_mic] Format name: %s.", pFormatCtx->iformat->name);
        
        // Find the first video stream
        audio_index = -1;
        for (i = 0; i < pFormatCtx->nb_streams; i++) {
            if (pFormatCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO &&
                audio_index < 0) {
                audio_index=i;
            }
        }
        
        /*
         * stream_component_open() start
         */
        cop_debug("[decode_thread_mic] Audio stream index: %d.", audio_index);
        
        if (audio_index < 0) {
            cop_error("[decode_thread_mic] Could not find a audio stream.");
            avformat_close_input(&pFormatCtx);
            continue;
        }

        result = stream_component_open(is, audio_index);
        if (result < 0) {
            cop_error("[decode_thread_mic] Could not open audio: %d.", result);
            avformat_close_input(&pFormatCtx);
            continue;
        }

        // Prepare resampling context

        // Get a pointer to the codec context for the audio stream
        const AVCodec *pCodec = avcodec_find_decoder(pFormatCtx->streams[audio_index]->codecpar->codec_id);
        if (pCodec==NULL) {
            cop_error("[decode_thread_mic] Codec not found.");
            return -1;
        }
        AVCodecContext *pCodecCtx = avcodec_alloc_context3(pCodec);
        if (avcodec_parameters_to_context(pCodecCtx, pFormatCtx->streams[audio_index]->codecpar) < 0) {
            cop_error("[decode_thread_mic] Failed to copy codec parameters to decoder context.");
            return STATUS_CODE_PLAYER_STREAM_CANT_COPY_CODEC;
        }
        // Open codec
        if(avcodec_open2(pCodecCtx, pCodec,NULL)<0){
            cop_error("[decode_thread_mic] Could not open codec.");
            return -1;
        }
        cop_debug("[decode_thread_mic] Prepare resampling context.");
        enum AVSampleFormat out_sample_fmt;
        out_sample_fmt=AV_SAMPLE_FMT_S16;
        uint64_t out_channel_layout=AV_CH_LAYOUT_STEREO;
        int64_t in_channel_layout = av_get_default_channel_layout(pCodecCtx->channels);
        int out_sample_rate=44100;
        is->au_convert_ctx = swr_alloc();
        is->au_convert_ctx = swr_alloc_set_opts(is->au_convert_ctx,
                                            out_channel_layout, out_sample_fmt,        out_sample_rate,
                                            in_channel_layout,  pCodecCtx->sample_fmt, pCodecCtx->sample_rate,
                                            0, NULL);
        swr_init(is->au_convert_ctx);
        if (pCodecCtx != NULL) {
            avcodec_close(pCodecCtx);
        }
        pCodecCtx = NULL;
        
        // We have all we need
        isInitialized = 1;
        
        avformat_flush(is->pFormatCtx);
        
        packet = (AVPacket*)av_malloc(sizeof(AVPacket));
        
        avformat_flush(is->pFormatCtx);
        
        while (true) {
            if (quit == 1) {
                cop_debug("[decode_thread_mic] Quit (context available).");
                break;
            }
            // Seek stuff goes here
            if (is->videoq.size > MAX_VIDEOQ_SIZE) {
                SDL_Delay(10);
                continue;
            }

            if (av_read_frame(is->pFormatCtx, packet) < 0) {
                if(is->pFormatCtx->pb->error == 0) {
                    SDL_Delay(100);
                    continue;
                } else {
                    break;
                }
            }
            // Is this a packet from the video stream?
            if(packet->stream_index == audio_index) {
                packet_queue_put(&is->audioq, packet);
            } else {
                av_packet_unref(packet);
            }
        }

        cop_debug("[decode_thread_mic] Close input and free port.");
        avformat_close_input(&pFormatCtx);
    }
    return STATUS_CODE_OK;
}

void player_stop(char* deviceId) {
    cop_debug("[player_stop] Stop device id: %s.", deviceId);
    int length = list_length (list_video_state);
    int indexToDelete = -1;
    for (int i = 0; i < length; i++) {
        struct list_item* item = list_get(list_video_state, i);
        VideoState* videoState = (VideoState*)item->data;
        if (equals(videoState->deviceId, deviceId)) {
            videoState->isStopped = true;
            if (USE_PROXY) {
                cop_debug("[player_stop] Stopping proxy.");
                proxy_close(videoState);
            }
            indexToDelete = i;
            break;
        }
    }
    if (indexToDelete == -1) {
        return;
    }

    cop_debug("[player_stop] Remove from list at %d.", indexToDelete);
    list_video_state = list_delete(list_video_state, indexToDelete);
}

/*
 * Adds a new client. Call 'initialize' before this method.
 */
int player_initialize(char* deviceId, char* listen_ip, int32_t listen_port_cam, int32_t listen_port_mic, char* password, uint32_t width, uint32_t height) {

    cop_debug("[player_initialize] %s %s:%d %d and width: %d and height: %d.", deviceId, listen_ip, listen_port_cam, listen_port_mic, width, height);

    VideoState* is = (VideoState*)av_mallocz(sizeof(VideoState));

    av_strlcpy(is->deviceId, deviceId, sizeof(is->deviceId));

    update_status(strdup(is->deviceId), strdup("PLAYER_INITIALIZE"));

    if (USE_PROXY) {
        if (listen_port_cam > 0) {
            proxy_init_cam(is, listen_ip, listen_port_cam, password);
            SDL_CreateThread(proxy_receive_udp_cam, "proxy_receive_udp_cam", is);
        }
        if (listen_port_mic > 0) {
            proxy_init_mic(is, listen_ip, listen_port_mic, password);
            SDL_CreateThread(proxy_receive_udp_mic, "proxy_receive_udp_mic", is);
        }
    } else {
        av_strlcpy(is->listen_ip, listen_ip, sizeof(is->listen_ip));
        is->listen_port_cam = listen_port_cam;
        is->listen_port_mic = listen_port_mic;
    }
    is->width = width;
    is->height = height;

    cop_debug("[player_initialize] Creating mutex.");
    is->pictq_mutex = SDL_CreateMutex();
    is->pictq_cond = SDL_CreateCond();
    
    schedule_refresh(is, 40);

    if (listen_port_cam > 0) {
        is->decode_tid_cam = SDL_CreateThread(decode_thread_cam, "decode_thread_cam", is);
        if (!is->decode_tid_cam) {
            cop_error("[player_initialize] cam: Could not create decode_thread.");
            av_free(is);
            return STATUS_CODE_NOK;
        }
    }
    if (listen_port_mic > 0) {
        is->decode_tid_mic = SDL_CreateThread(decode_thread_mic, "decode_thread_mic", is);
        if (!is->decode_tid_mic) {
            cop_error("[player_initialize] mic: Could not create decode_thread.");
            av_free(is);
            return STATUS_CODE_NOK;
        }
    }

    list_video_state = list_push(list_video_state, is);

    return STATUS_CODE_OK;
}

