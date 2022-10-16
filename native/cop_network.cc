#include <stdio.h>
#include <stdlib.h>

#ifdef _WIN32
    // Windows
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #include <io.h> // for close()
#else
    // Mac
    #include <arpa/inet.h>
    #include <sys/socket.h>
    #include <unistd.h> // for close()
#endif

#include "cop_network.h"
#include "cop_utility.h"
#include "cop_status_code.h"

// 188 * 7 (mpegts packet has 188) 
#define PROXY_SEND_BUFFER_SIZE_BYTES 1316
#define PROXY_BUFFER_SIZE_BYTES 1316

void close_socket(int s) {

#ifdef _WIN32
    // Windows
    closesocket(s);
#else
    close(s);
#endif

}

void proxy_init_cam(VideoState* videoState, char* listen_ip, uint32_t listen_port, const char* encryption_pwd) {
    cop_debug("[proxy_init_cam].");
    videoState->proxy_send_udp_socket_cam = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (videoState->proxy_send_udp_socket_cam < 0) {
        cop_error("[proxy_init_cam] Could not create socket: %d.", videoState->proxy_send_udp_socket_cam);
        return;
    }
    videoState->dest_addr.sin_family = AF_INET;
#ifdef _WIN32
    inet_pton(AF_INET, "127.0.0.1", &(videoState->dest_addr.sin_addr.s_addr));
#else
    videoState->dest_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
#endif
    videoState->dest_addr.sin_port = htons(listen_port + 1000);
    av_strlcpy(videoState->listen_ip, listen_ip, sizeof(videoState->listen_ip));
    videoState->listen_port_cam = listen_port;
    av_strlcpy(videoState->encryption_pwd_cam, encryption_pwd, sizeof(videoState->encryption_pwd_cam));

    cop_debug("[proxy_init_cam] Proxy -> Player: 127.0.0.1 %d. Network -> Proxy: %s %d", listen_port + 1000, listen_ip, listen_port);

    videoState->is_proxy_running_cam = true;

    cop_debug("[proxy_init_cam] Done.");
}

void proxy_init_mic(VideoState* videoState, char* listen_ip, uint32_t listen_port, const char* encryption_pwd) {
    cop_debug("[proxy_init_mic].");
    videoState->proxy_send_udp_socket_mic = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (videoState->proxy_send_udp_socket_mic < 0) {
        cop_error("[proxy_init_mic] Could not create socket: %d.", videoState->proxy_send_udp_socket_mic);
        return;
    }
    videoState->dest_addr.sin_family = AF_INET;
#ifdef _WIN32
    inet_pton(AF_INET, "127.0.0.1", &(videoState->dest_addr.sin_addr.s_addr));
#else
    videoState->dest_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
#endif
    videoState->dest_addr.sin_port = htons(listen_port + 1000);
    av_strlcpy(videoState->listen_ip, listen_ip, sizeof(videoState->listen_ip));
    videoState->listen_port_mic = listen_port;
    av_strlcpy(videoState->encryption_pwd_mic, encryption_pwd, sizeof(videoState->encryption_pwd_mic));

    cop_debug("[proxy_init_mic] Proxy -> Player: 127.0.0.1 %d. Network -> Proxy: %s %d", listen_port + 1000, listen_ip, listen_port);

    videoState->is_proxy_running_mic = true;

    cop_debug("[proxy_init_mic] Done.");
}

void proxy_close(VideoState* videoState) {
    cop_debug("[proxy_close].");
    if (videoState->proxy_send_udp_socket_cam < 0) {
        cop_error("[proxy_close] cam: Socket send not open: %d.", videoState->proxy_send_udp_socket_cam);
    } else {
        cop_debug("[proxy_close] cam: Close proxy_send_udp_socket.");
        close_socket(videoState->proxy_send_udp_socket_cam);
    }
    if (videoState->proxy_send_udp_socket_mic < 0) {
        cop_error("[proxy_close] mic: Socket send not open: %d.", videoState->proxy_send_udp_socket_mic);
    } else {
        cop_debug("[proxy_close] mic: Close proxy_send_udp_socket.");
        close_socket(videoState->proxy_send_udp_socket_mic);
    }

    if (videoState->proxy_receive_udp_socket_cam < 0) {
        cop_error("[proxy_close] cam: Socket receive not open: %d.", videoState->proxy_receive_udp_socket_cam);
    } else {
        cop_debug("[proxy_close] cam: Close proxy_receive_udp_socket.");
        close_socket(videoState->proxy_receive_udp_socket_cam);
    }
    videoState->is_proxy_running_cam = false;

    if (videoState->proxy_receive_udp_socket_mic < 0) {
        cop_error("[proxy_close] mic: Socket receive not open: %d.", videoState->proxy_receive_udp_socket_mic);
    } else {
        cop_debug("[proxy_close] mic: Close proxy_receive_udp_socket.");
        close_socket(videoState->proxy_receive_udp_socket_mic);
    }
    videoState->is_proxy_running_mic = false;
    
    cop_debug("[proxy_close] Done.");
}

static void proxy_send_udp_cam(VideoState* videoState, const char* data) {

    if (videoState->proxy_send_udp_socket_cam < 0) {
        cop_error("[proxy_send_udp_cam] Socket not available: %d", videoState->proxy_send_udp_socket_cam);
    }

    int result = sendto(videoState->proxy_send_udp_socket_cam, data, PROXY_SEND_BUFFER_SIZE_BYTES, 0, (struct sockaddr *)&videoState->dest_addr, sizeof(videoState->dest_addr));
    if (result < 0) {
        cop_error("[proxy_send_udp_cam] Could not send data. Result: %d.", result);
    }
}

static void proxy_send_udp_mic(VideoState* videoState, const char* data) {

    if (videoState->proxy_send_udp_socket_mic < 0) {
        cop_error("[proxy_send_udp_mic] Socket not available: %d", videoState->proxy_send_udp_socket_mic);
    }

    int result = sendto(videoState->proxy_send_udp_socket_mic, data, PROXY_SEND_BUFFER_SIZE_BYTES, 0, (struct sockaddr *)&videoState->dest_addr, sizeof(videoState->dest_addr));
    if (result < 0) {
        cop_error("[proxy_send_udp_mic] Could not send data. Result: %d.", result);
    }
}

/*
 * type: 0 = cam, 1 = mic
 */
int proxy_receive_udp(int type, const char* listen_ip, int listen_port, VideoState* video_state) {

    struct sockaddr_in addr, si_other;
    if (type == 0) {
        video_state->proxy_receive_udp_socket_cam = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
        if (video_state->proxy_receive_udp_socket_cam == -1) {
            cop_error("[proxy_receive_udp] cam: Could not create socket.");
            return STATUS_CODE_NOK;
        }
    } else if (type == 1) {
        video_state->proxy_receive_udp_socket_mic = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
        if (video_state->proxy_receive_udp_socket_mic == -1) {
            cop_error("[proxy_receive_udp] mic: Could not create socket.");
            return STATUS_CODE_NOK;
        }
    }

    cop_debug("[proxy_receive_udp] Type: %d. Listen to port: %d.", type, listen_port);

    addr.sin_family = AF_INET;
    addr.sin_port = htons(listen_port);
#ifdef _WIN32
    inet_pton(AF_INET, listen_ip, &(addr.sin_addr.s_addr));
#else
    addr.sin_addr.s_addr = inet_addr(listen_ip);
#endif

    if (type == 0) {
        int result = bind(video_state->proxy_receive_udp_socket_cam, (struct sockaddr *)&addr, sizeof(addr));
        if (result == -1) {
            cop_error("[proxy_receive_udp] cam: Could not bind socket do %d.", listen_port);
            return STATUS_CODE_NOK;
        }
    } else if (type == 1) {
        int result = bind(video_state->proxy_receive_udp_socket_mic, (struct sockaddr *)&addr, sizeof(addr));
        if (result == -1) {
            cop_error("[proxy_receive_udp] mic: Could not bind socket do %d.", listen_port);
            return STATUS_CODE_NOK;
        }
    }

    char* sendBuffer = (char*)malloc(sizeof(char) * PROXY_SEND_BUFFER_SIZE_BYTES);
    memset(sendBuffer, '\0', PROXY_SEND_BUFFER_SIZE_BYTES);
    int sendIndex = 0;

    char* buffer = (char*)malloc(sizeof(char) * PROXY_BUFFER_SIZE_BYTES);
    memset(buffer, '\0', PROXY_BUFFER_SIZE_BYTES);

#ifdef _WIN32
    int slen=sizeof(addr);
#else
    unsigned slen=sizeof(addr);
#endif

    while ((type == 0 && video_state->is_proxy_running_cam) || (type == 1 && video_state->is_proxy_running_mic)) {

        int read = -1;
        if (type == 0) {
            read = recvfrom(video_state->proxy_receive_udp_socket_cam, buffer, PROXY_BUFFER_SIZE_BYTES, 0, (struct sockaddr *)&si_other, &slen);
        } else if (type == 1) {
            read = recvfrom(video_state->proxy_receive_udp_socket_mic, buffer, PROXY_BUFFER_SIZE_BYTES, 0, (struct sockaddr *)&si_other, &slen);
        }

        if (read == -1) {
            cop_error("[proxy_receive_udp] Stop proxy.");
            break;
        }

        if (sendIndex + read < PROXY_SEND_BUFFER_SIZE_BYTES) {
            // Buffer won't be filled
            memcpy(&sendBuffer[sendIndex], buffer, read);
            sendIndex += read;
        } else {
            // Buffer is filled
            memcpy(&sendBuffer[sendIndex], buffer, PROXY_SEND_BUFFER_SIZE_BYTES - sendIndex);

            // Do encryption
            if (type == 0) {
                size_t pwd_length = strlen(video_state->encryption_pwd_cam);
                if (pwd_length > 0) {
                    for(int i = 0; i < PROXY_SEND_BUFFER_SIZE_BYTES; i++) {
                        sendBuffer[i] = sendBuffer[i] ^ video_state->encryption_pwd_cam[i % pwd_length];
                    }
                }
                proxy_send_udp_cam(video_state, sendBuffer);
            } else if (type == 1) {
                size_t pwd_length = strlen(video_state->encryption_pwd_mic);
                if (pwd_length > 0) {
                    for(int i = 0; i < PROXY_SEND_BUFFER_SIZE_BYTES; i++) {
                        sendBuffer[i] = sendBuffer[i] ^ video_state->encryption_pwd_mic[i % pwd_length];
                    }
                }
                proxy_send_udp_mic(video_state, sendBuffer);
            }
            memcpy(sendBuffer, &buffer[PROXY_SEND_BUFFER_SIZE_BYTES - sendIndex], read - (PROXY_SEND_BUFFER_SIZE_BYTES - sendIndex));
            sendIndex = read - (PROXY_SEND_BUFFER_SIZE_BYTES - sendIndex);
        }
    }

    return STATUS_CODE_OK;
}

int proxy_receive_udp_cam(void* arg) {
    VideoState *video_state = (VideoState*)arg;
    proxy_receive_udp(0, video_state->listen_ip, video_state->listen_port_cam, video_state);
    return STATUS_CODE_OK;
}

int proxy_receive_udp_mic(void* arg) {
    VideoState *video_state = (VideoState*)arg;
    proxy_receive_udp(1, video_state->listen_ip, video_state->listen_port_mic, video_state);
    return STATUS_CODE_OK;
}