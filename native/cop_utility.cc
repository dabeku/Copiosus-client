#include "cop_utility.h"

void cop_debug(const char* format, ...) {
    va_list argptr;

    time_t rawtime;
    struct tm * timeinfo;
    time ( &rawtime );
    timeinfo = localtime ( &rawtime );
    char output[128];
    sprintf(
        output,
        "[%d.%02d.%02d %02d:%02d:%02d]",
        timeinfo->tm_mday,
        timeinfo->tm_mon + 1,
        timeinfo->tm_year + 1900,
        timeinfo->tm_hour,
        timeinfo->tm_min,
        timeinfo->tm_sec);

    const char* prefix = concat(output, " [debug] ");
    format = concat(prefix, format);
    format = concat(format, "\n");

    va_start(argptr, format);
    vfprintf(stdout, format, argptr);
    va_end(argptr);
    fflush(stdout);
}

void cop_error(const char* format, ...) {
    va_list argptr;

    time_t rawtime;
    struct tm * timeinfo;
    time ( &rawtime );
    timeinfo = localtime ( &rawtime );
    char output[128];
    sprintf(
        output,
        "[%d.%02d.%02d %02d:%02d:%02d]",
        timeinfo->tm_mday,
        timeinfo->tm_mon + 1,
        timeinfo->tm_year + 1900,
        timeinfo->tm_hour,
        timeinfo->tm_min,
        timeinfo->tm_sec);

    const char* prefix = concat(output, " [ERROR] ");
    format = concat(prefix, format);
    format = concat(format, "\n");

    va_start(argptr, format);
    vfprintf(stdout, format, argptr);
    va_end(argptr);
    fflush(stdout);
}

char* concat(const char *str1, const char *str2) {
    char *result = (char *) malloc(strlen(str1)+strlen(str2)+1); //+1 for the zero-terminator
    strcpy(result, str1);
    strcat(result, str2);
    return result;
}

bool equals(char* str1, char* str2) {
    int ret = strncmp(str1, str2, BUFFER_SIZE);

    if (ret == 0) {
        return true;
    }
    return false;
}

int decode(AVCodecContext *avctx, AVFrame *frame, AVPacket *pkt, int *got_frame) {
    int ret;
    
    *got_frame = 0;
    
    if (pkt) {
        ret = avcodec_send_packet(avctx, pkt);
        // In particular, we don't expect AVERROR(EAGAIN), because we read all
        // decoded frames with avcodec_receive_frame() until done.
        if (ret < 0) {
            printf("[encode] Error sending a frame for decoding: %d.\n", ret);
            return ret == AVERROR_EOF ? 0 : ret;
        }
    }
    
    ret = avcodec_receive_frame(avctx, frame);
    if (ret < 0 && ret != AVERROR(EAGAIN) && ret != AVERROR_EOF) {
        printf("[encode] Error receiving a frame from decoding: %d.\n", ret);
        return ret;
    } else if (ret >= 0) {
        *got_frame = 1;
    }
    
    return 0;
}

char* int_to_str(int num) {
    char* str = (char*)calloc(32, sizeof(char));
    sprintf(str, "%d", num);
    return str;
}