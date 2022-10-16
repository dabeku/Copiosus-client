//#include <nan.h>
#include "bridge.h"

using v8::FunctionTemplate;

NAN_MODULE_INIT(initAll) {
    Nan::Set(target, Nan::New("initialize").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(initialize)).ToLocalChecked());
    Nan::Set(target, Nan::New("reset").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(reset)).ToLocalChecked());
    Nan::Set(target, Nan::New("player_initialize").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(player_initialize)).ToLocalChecked());
    Nan::Set(target, Nan::New("player_stop").ToLocalChecked(),
        Nan::GetFunction(Nan::New<FunctionTemplate>(player_stop)).ToLocalChecked());
}

NAN_MODULE_WORKER_ENABLED(video, initAll)
