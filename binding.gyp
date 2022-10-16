{
    "variables" : {
        "include_path" : "/Users/gwen/Documents/lib/FFmpeg"
    },
    "targets": [{
            "target_name": "video",
            "sources": [
                "native/video.cc",
                "native/bridge.cc",
                "native/copiosus.cc",
                "native/cop_player.cc",
                "native/cop_network.cc",
                "native/cop_utility.cc",
                "native/cop_list.cc",
            ],
            "include_dirs": [
                "<!(node -e \"require('nan')\")",
                "<(include_path)",
                "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/include",
                "C:/Dev/lib/SDL2-2.0.10/include",
            ],

            "conditions":[
                ["OS=='linux'", {
                    
                }],
                ["OS=='mac'", {
                    "libraries" : [
                        "-lavdevice",
                        "-lavformat",
                        "-lavfilter",
                        "-lavcodec",
                        "-lswresample",
                        "-lswscale",
                        "-lavutil",
                        "-framework AVFoundation",
                        "-framework QuartzCore",
                        "-framework CoreMedia",
                        "-framework Cocoa",
                        "/usr/local/lib/libSDL2.a"
                    ]
                }],
                ["OS=='win'", {
                    "libraries" : [
                        "-lWs2_32.lib",
                        "C:/Dev/lib/SDL2-2.0.10/lib/x64/SDL2.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/avdevice.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/avformat.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/avfilter.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/avcodec.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/swresample.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/swscale.lib",
                        "C:/Dev/lib/ffmpeg-20191214-24424a6-win64-dev/lib/avutil.lib"
                        
                    ]
                }]
            ], 
        }
    ]
}