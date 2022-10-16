#ifndef COP_UTILITY_H
#define COP_UTILITY_H

#include <stdlib.h>
#include <stdio.h>
#include <stdarg.h>
#include <stdbool.h> // bool
#include <string.h>
#include <time.h>

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

// A generic buffer size used for network and strings. Use whenever possible.
#define BUFFER_SIZE 512

void cop_debug(const char* format, ...);
void cop_error(const char* format, ...);
char* concat(const char *str1, const char *str2);
char* int_to_str(int num);
bool equals(char* str1, char* str2);

int decode(AVCodecContext *avctx, AVFrame *frame, AVPacket *pkt, int *got_frame);

#endif