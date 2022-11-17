#ifndef NATIVE_EXTENSION_GRAB_H
#define NATIVE_EXTENSION_GRAB_H

#include <nan.h>

#ifdef _WIN32
    // Windows
    #include <stdint.h> // u_int8_t
    typedef uint8_t u_int8_t;
    typedef uint16_t u_int16_t;
    typedef uint32_t u_int32_t;
#endif

void update_frame(char* deviceid, u_int8_t *data, int width, int height);
void update_status(char* deviceid, char *status);

NAN_METHOD(initialize);
NAN_METHOD(initialize_update_status);
NAN_METHOD(reset);
NAN_METHOD(player_initialize);
NAN_METHOD(player_stop);

#endif