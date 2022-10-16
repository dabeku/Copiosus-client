#ifndef COP_PLAYER_H
#define COP_PLAYER_H

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

int player_initialize(char* deviceId, char* listen_ip, int32_t listen_port_cam, int32_t listen_port_mic, char* password, uint32_t width, uint32_t height);
void player_stop(char* deviceId);

#endif