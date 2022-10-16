//
//  scr-network.h
//  
//
//  Created by gwen on 13/05/2017.
//
//

#ifndef COP_NETWORK_H
#define COP_NETWORK_H

#include "cop_state.h"

void proxy_close(VideoState* videoState);
void proxy_init_cam(VideoState* videoState, char* listen_ip, uint32_t listen_port, const char* encryption_pwd);
void proxy_init_mic(VideoState* videoState, char* listen_ip, uint32_t listen_port, const char* encryption_pwd);
int proxy_receive_udp_cam(void* arg);
int proxy_receive_udp_mic(void* arg);

#endif /* scr_network_h */
