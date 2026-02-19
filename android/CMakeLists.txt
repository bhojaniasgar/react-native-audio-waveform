project(AudioWaveformNitro)
cmake_minimum_required(VERSION 3.18.1)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find all C++ files (shared and platform specifics)
file(GLOB_RECURSE shared_files RELATIVE ${CMAKE_SOURCE_DIR}
     "../cpp/**.cpp"
)
file(GLOB_RECURSE android_files RELATIVE ${CMAKE_SOURCE_DIR}
     "src/main/cpp/**.cpp"
)

# Create library "AudioWaveformNitro" and add all C++ files to it
add_library(
  AudioWaveformNitro
  SHARED
  ${shared_files}
  ${android_files}
)

# Specifies a path to native header files
include_directories(
  # Shared C++ includes
  ../cpp
  # Android-specific C++ includes
  src/main/cpp
)

# Find required libraries
find_library(LOG_LIB log)
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

# Link all libraries together
target_link_libraries(
  AudioWaveformNitro
  ${LOG_LIB}                                # <-- Logcat logger
  android                                   # <-- Android JNI core
  fbjni::fbjni                              # <-- Facebook C++ JNI helpers
  ReactAndroid::jsi                         # <-- RN: JSI
)

# Link react-native (different prefab between RN 0.75 and RN 0.76)
if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(
        AudioWaveformNitro
        ReactAndroid::reactnative             # <-- RN: Native Modules umbrella prefab
    )
else()
    target_link_libraries(
        AudioWaveformNitro
        ReactAndroid::react_nativemodule_core # <-- RN: TurboModules Core
        ReactAndroid::turbomodulejsijni       # <-- RN: TurboModules utils
    )
endif()
