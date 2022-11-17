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


/*
 * Image
 */

SDL_mutex* update_frame_mutex = SDL_CreateMutex();
// The javascript callback to be called when a new image is available
Nan::Callback frame_callback;
// The last data sent to callback
int is_update_frame_processing = 0;
u_int8_t *last_frame_data = NULL;
char *last_frame_device_id = NULL;
// Will be overriden by player_initialize()
int last_width = 640;
int last_height = 480;
/*
 * Callback from other thread
 */
uv_async_t update_frame_async; // Keep this instance around for as long as we might need to do the periodic callback
uv_loop_t* update_frame_loop = uv_default_loop();

/*
 * Status
 */
SDL_mutex* update_status_mutex = SDL_CreateMutex();
Nan::Callback status_callback;
int is_update_status_processing = 0;
char *last_status_deviceId = NULL;
char *last_status = 0;
uv_async_t update_status_async;
uv_loop_t* update_status_loop = uv_default_loop();

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

void frameAsyncmsg(uv_async_t* handle) {
    Nan::HandleScope scope;
    Nan::AsyncResource resource("copiosus:video:frame_callback");
    SDL_LockMutex(update_frame_mutex);
    v8::Local<v8::Value> ptr = WrapPointer((char *)last_frame_data, 3 * last_width * last_height);
    v8::Local<v8::Value> deviceId = WrapPointer(last_frame_device_id, strlen(last_frame_device_id));
    v8::Local<v8::Value> argv[] = { deviceId, ptr };
    frame_callback.Call(2, argv, &resource);
    free(last_frame_device_id);
    free(last_frame_data);
    is_update_frame_processing = 0;
    SDL_UnlockMutex(update_frame_mutex);
}

void statusAsyncmsg(uv_async_t* handle) {
    Nan::HandleScope scope;
    Nan::AsyncResource resource("copiosus:video:status_callback");
    SDL_LockMutex(update_status_mutex);
    v8::Local<v8::Value> deviceId = WrapPointer(last_status_deviceId, strlen(last_status_deviceId));
    v8::Local<v8::Value> status = WrapPointer(last_status, strlen(last_status));
    v8::Local<v8::Value> argv[] = { deviceId, status };
    status_callback.Call(2, argv, &resource);
    free(last_frame_device_id);
    is_update_status_processing = 0;
    SDL_UnlockMutex(update_status_mutex);
}

void update_frame(char* deviceId, u_int8_t *data, int width, int height) {
    SDL_LockMutex(update_frame_mutex);
    if (is_update_frame_processing == 1) {
        free(deviceId);
        free(data);
        SDL_UnlockMutex(update_frame_mutex);
        return;
    }
    is_update_frame_processing = 1;
    last_frame_device_id = deviceId;
    last_frame_data = data;
    last_width = width;
    last_height = height;
    SDL_UnlockMutex(update_frame_mutex);
    uv_async_send(&update_frame_async);
}

/*
 * 1 = PLAYER_INITIALIZE
 * 2 = WAIT_FOR_FRAME
 */
void update_status(char* deviceId, char* status) {
    SDL_LockMutex(update_status_mutex);
    if (is_update_status_processing == 1) {
        free(deviceId);
        SDL_UnlockMutex(update_status_mutex);
        return;
    }
    is_update_status_processing = 1;
    last_status_deviceId = deviceId;
    last_status = status;
    SDL_UnlockMutex(update_status_mutex);
    uv_async_send(&update_status_async);
}

NAN_METHOD(initialize) {
    frame_callback.Reset(info[0].As<v8::Function>());
    uv_async_init(update_frame_loop, &update_frame_async, frameAsyncmsg);
    initialize();
}

NAN_METHOD(initialize_update_status) {
    status_callback.Reset(info[0].As<v8::Function>());
    uv_async_init(update_status_loop, &update_status_async, statusAsyncmsg);
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