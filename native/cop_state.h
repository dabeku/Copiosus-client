#ifndef COP_STATE_H
#define COP_STATE_H

#ifdef _WIN32
    // Windows
    #include <winsock2.h>
#else
    // Mac
    #include <arpa/inet.h>
    #include <sys/socket.h>
#endif

extern "C" {
    #include <libavcodec/avcodec.h>
    #include <libavformat/avformat.h>
    #include <libswresample/swresample.h>
    #include <libswscale/swscale.h>
    #include <libavutil/avstring.h>
    #include <libavutil/avutil.h>
    #include <libavutil/imgutils.h>
    #include <libavutil/base64.h>

#ifdef _WIN32
    // Windows
    #include <SDL.h>
    #include <SDL_thread.h>
#else
    // Mac
    #include <SDL2/SDL.h>
    #include <SDL2/SDL_thread.h>
#endif
}

#define VIDEO_PICTURE_QUEUE_SIZE 1

#define AVCODEC_MAX_AUDIO_FRAME_SIZE 192000

typedef struct PacketList {
    AVPacket pkt;
    PacketList* next;
} PacketList;

typedef struct PacketQueue {
    PacketList *first_pkt, *last_pkt;
    int nb_packets;
    int size;
    SDL_mutex *mutex;
    SDL_cond *cond;
} PacketQueue;

typedef struct VideoPicture {
    int width, height;
    int allocated;
} VideoPicture;

typedef struct VideoState {
    
    AVFormatContext *pFormatCtx;

    AVStream        *audio_st;
    AVCodecContext  *audio_ctx;
    PacketQueue     audioq;
    uint8_t         audio_buf[(AVCODEC_MAX_AUDIO_FRAME_SIZE * 2)];
    unsigned int    audio_buf_size;
    unsigned int    audio_buf_index;
    AVFrame         audio_frame;
    AVPacket        audio_pkt;
    uint8_t         *audio_pkt_data;
    int             audio_pkt_size;
    
    AVStream        *video_st;
    AVCodecContext  *video_ctx;
    PacketQueue     videoq;
    struct SwsContext *sws_ctx;
    
    VideoPicture    pictq[VIDEO_PICTURE_QUEUE_SIZE];
    int             pictq_size, pictq_rindex, pictq_windex;
    SDL_mutex       *pictq_mutex;
    SDL_cond        *pictq_cond;
    
    SDL_Thread      *decode_tid_cam;
    SDL_Thread      *decode_tid_mic;
    SDL_Thread      *video_tid;

    /*
     * Audio
     */

    // The resampling context
    SwrContext      *au_convert_ctx;

    /*
     * Generic
     */

    // The unique id of the client
    char            deviceId[1024];

    // The listening URL
    char            listen_ip[1024];
    int             listen_port_cam;
    int             listen_port_mic;

    // Camera specifics
    int             width;
    int             height;

    // Proxy settings
    bool is_proxy_running_cam             = false;
    bool is_proxy_running_mic             = false;

    int proxy_send_udp_socket_cam       = -1;
    int proxy_send_udp_socket_mic       = -1;
    
    int proxy_receive_udp_socket_cam    = -1;
    int proxy_receive_udp_socket_mic    = -1;

    sockaddr_in dest_addr;

    char            encryption_pwd_cam[1024];
    char            encryption_pwd_mic[1024];
    
    bool            isStopped;

} VideoState;

#endif