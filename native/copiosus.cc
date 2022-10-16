#include "copiosus.h"
#include "bridge.h"

#include "cop_utility.h"
#include "cop_status_code.h"
#include "cop_state.h"

#include <stdio.h>

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

#define FF_REFRESH_EVENT (SDL_USEREVENT)
#define FF_QUIT_EVENT (SDL_USEREVENT + 1)

int quit = 0;

// Global event handler
SDL_Thread *event_tid = NULL;


static Uint32 sdl_refresh_timer_cb(Uint32 interval, void *opaque) {
    SDL_Event event;
    event.type = FF_REFRESH_EVENT;
    event.user.data1 = opaque;
    SDL_PushEvent(&event);
    return 0; // 0 means stop timer
}

void schedule_refresh(VideoState *is, int delay) {
    //cop_debug("Schedule refresh: %d", delay);
    SDL_AddTimer(delay, sdl_refresh_timer_cb, is);
}

// Called by timer: Update video frame
static void video_refresh_timer(void *userdata) {
    
    VideoState *is = (VideoState *)userdata;

    if (is->isStopped == true) {
        cop_debug("[video_refresh_timer] Stopped.");
        return;
    }

    VideoPicture *vp;
    
    if (is->video_st) {
        if (is->pictq_size == 0) {
            schedule_refresh(is, 1);
        } else {
            vp = &is->pictq[is->pictq_rindex];
            // Do not wait as we process immediately
            schedule_refresh(is, 0);

            // Update queue for next picture
            if(++is->pictq_rindex == VIDEO_PICTURE_QUEUE_SIZE) {
                is->pictq_rindex = 0;
            }
            SDL_LockMutex(is->pictq_mutex);
            is->pictq_size--;
            SDL_CondSignal(is->pictq_cond);
            SDL_UnlockMutex(is->pictq_mutex);
        }
    } else {
        // Wait for the video stream
        schedule_refresh(is, 100);
    }
}

static int wait_event_thread(void *ptr) {
    cop_debug("[wait_event_thread].");
    SDL_Event event;
    while(true) {
        SDL_WaitEvent(&event);
        switch(event.type) {
            case FF_QUIT_EVENT:
                cop_debug("[wait_event_thread] Received quit event.");
                SDL_Quit();
                quit = 1;
                return STATUS_CODE_OK;
            case FF_REFRESH_EVENT:
                //cop_debug("[wait_event_thread] Refresh.");
                video_refresh_timer(event.user.data1);
                break;
            default:
                break;
        }
    }
    return STATUS_CODE_OK;
}

int initialize() {

    quit = 0;
    
    // Not needed anymore: av_register_all();

    cop_debug("[initialize] Calling avformat_network_init().");
    avformat_network_init();

    if (SDL_Init(SDL_INIT_AUDIO | SDL_INIT_TIMER) < 0) {
        cop_error("[initialize] Error: Failed to initialize SDL.");
        return STATUS_CODE_NOK;
    }

    cop_debug("[initialize] Calling SDL_CreateThread().");
    event_tid = SDL_CreateThread(wait_event_thread, "wait_event_thread", (void *)NULL);
    if (!event_tid) {
        cop_error("[initialize] Error: Could not create wait_event_thread.");
        return STATUS_CODE_NOK;
    }

    cop_debug("[initialize] Done.");

    return STATUS_CODE_OK;
}

int reset() {
    cop_debug("[reset].");

    SDL_Event event;
    event.type = FF_QUIT_EVENT;
    SDL_PushEvent(&event);

    cop_debug("[reset] SDL stop.");
    
    return STATUS_CODE_OK;
}