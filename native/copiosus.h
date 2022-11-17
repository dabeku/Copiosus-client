#ifndef COPIOSUS_H
#define COPIOSUS_H

#include "cop_state.h"

// A global quit flag: 0 = running, 1 = quit
extern int quit;

int initialize();
int initializeUpdateStatus();
int reset();
void schedule_refresh(VideoState *is, int delay);

#endif