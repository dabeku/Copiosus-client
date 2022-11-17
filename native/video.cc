//#include <nan.h>
#include "bridge.h"

using v8::FunctionTemplate;

NAN_MODULE_INIT(initAll) {
    // Callback: New image
    Nan::Set(target, Nan::New("initialize").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(initialize)).ToLocalChecked());
    // Callback: Status change
    Nan::Set(target, Nan::New("initialize_update_status").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(initialize_update_status)).ToLocalChecked());
    Nan::Set(target, Nan::New("reset").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(reset)).ToLocalChecked());
    Nan::Set(target, Nan::New("player_initialize").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(player_initialize)).ToLocalChecked());
    Nan::Set(target, Nan::New("player_stop").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(player_stop)).ToLocalChecked());
}

NAN_MODULE_WORKER_ENABLED(video, initAll)
