#include "bridge.h"
#include "copiosus.h"
#include "cop_player.h"
#include "cop_utility.h"

extern "C" {
    
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

SDL_mutex* mutex = SDL_CreateMutex();

// The javascript callback to be called when a new image is available
Nan::Callback callback;

// The last data sent to callback
int isProcessing = 0;
u_int8_t *lastData = NULL;
char *lastDeviceId = NULL;
// Will be overriden by player_initialize()
int lastWidth = 640;
int lastHeight = 480;

/*
 * Callback from other thread
 */
uv_async_t async; // Keep this instance around for as long as we might need to do the periodic callback
uv_loop_t* loop = uv_default_loop();

void wrap_pointer_cb(char *data, void *hint) {
  //fprintf(stderr, "wrap_pointer_cb\n");
}

inline v8::Local<v8::Value> WrapPointer(char *ptr, size_t length) {
  Nan::EscapableHandleScope scope;
  return scope.Escape(Nan::NewBuffer(ptr, length, wrap_pointer_cb, NULL).ToLocalChecked());
}

inline v8::Local<v8::Value> WrapPointer(char *ptr) {
  return WrapPointer(ptr, 0);
}

void asyncmsg(uv_async_t* handle) {
    Nan::HandleScope scope;
    Nan::AsyncResource resource("copiosus:video:callback");
    SDL_LockMutex(mutex);
    v8::Local<v8::Value> ptr = WrapPointer((char *)lastData, 3 * lastWidth * lastHeight);
    v8::Local<v8::Value> deviceId = WrapPointer(lastDeviceId, strlen(lastDeviceId));
    v8::Local<v8::Value> argv[] = { deviceId, ptr };
    callback.Call(2, argv, &resource);
    free(lastDeviceId);
    free(lastData);
    isProcessing = 0;
    SDL_UnlockMutex(mutex);
}

void update(char* deviceId, u_int8_t *data, int width, int height) {
    SDL_LockMutex(mutex);
    if (isProcessing == 1) {
        free(deviceId);
        free(data);
        SDL_UnlockMutex(mutex);
        return;
    }
    isProcessing = 1;
    lastDeviceId = deviceId;
    lastData = data;
    lastWidth = width;
    lastHeight = height;
    SDL_UnlockMutex(mutex);
    uv_async_send(&async);
}

NAN_METHOD(initialize) {
    callback.Reset(info[0].As<v8::Function>());
    uv_async_init(loop, &async, asyncmsg);
    initialize();
}

NAN_METHOD(reset) {
    reset();
}

void player_initialize(const Nan::FunctionCallbackInfo<v8::Value>& info) {

    if (info.Length() != 7) {
        Nan::ThrowTypeError("Wrong number of arguments.");
        return;
    }

    if (!info[0]->IsString()) {
        Nan::ThrowTypeError("Wrong argument 0.");
        return;
    }

    if (!info[1]->IsString()) {
        Nan::ThrowTypeError("Wrong argument 1.");
        return;
    }

    if (!info[2]->IsInt32()) {
        Nan::ThrowTypeError("Wrong argument 2.");
        return;
    }

    if (!info[3]->IsInt32()) {
        Nan::ThrowTypeError("Wrong argument 3.");
        return;
    }

    if (!info[4]->IsString()) {
        Nan::ThrowTypeError("Wrong argument 4.");
        return;
    }

    Nan::Utf8String deviceId(info[0]->ToString(Nan::GetCurrentContext()).FromMaybe(v8::Local<v8::String>()));
    Nan::Utf8String ip(info[1]->ToString(Nan::GetCurrentContext()).FromMaybe(v8::Local<v8::String>()));
    int32_t video_port = info[2]->Int32Value(Nan::GetCurrentContext()).ToChecked();
    int32_t audio_port = info[3]->Int32Value(Nan::GetCurrentContext()).ToChecked();
    Nan::Utf8String password(info[4]->ToString(Nan::GetCurrentContext()).FromMaybe(v8::Local<v8::String>()));
    uint32_t width = info[5]->Uint32Value(Nan::GetCurrentContext()).ToChecked();
    uint32_t height = info[6]->Uint32Value(Nan::GetCurrentContext()).ToChecked();
    player_initialize((char*)(*deviceId), (char*)(*ip), video_port, audio_port, (char*)(*password), width, height);
}

void player_stop(const Nan::FunctionCallbackInfo<v8::Value>& info) {

    if (info.Length() != 1) {
        Nan::ThrowTypeError("Wrong number of arguments.");
        return;
    }

    if (!info[0]->IsString()) {
        Nan::ThrowTypeError("Wrong arguments.");
        return;
    }

    Nan::Utf8String deviceId(info[0]->ToString(Nan::GetCurrentContext()).FromMaybe(v8::Local<v8::String>()));
    player_stop((char*)(*deviceId));
}