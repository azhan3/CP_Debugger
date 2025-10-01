cmake_minimum_required(VERSION 3.15)
project(CPDebugger LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CURL_ROOT "C:/curl-8.16.0" CACHE PATH "Root folder of the local cURL installation")
set(CURL_CUSTOM_INCLUDE "${CURL_ROOT}/include" CACHE PATH "Directory that contains curl/curl.h")
set(CURL_CUSTOM_LIB "${CURL_ROOT}/lib" CACHE PATH "Directory that contains the cURL libraries")

find_package(CURL QUIET)

if(NOT CURL_FOUND)
	find_path(CURL_INCLUDE_DIR
		NAMES curl/curl.h
		PATHS ${CURL_CUSTOM_INCLUDE}
		NO_DEFAULT_PATH)

	find_library(CURL_LIBRARY
		NAMES libcurl_imp libcurl curl
		PATHS ${CURL_CUSTOM_LIB}
		NO_DEFAULT_PATH)

	if(NOT CURL_INCLUDE_DIR OR NOT CURL_LIBRARY)
		message(FATAL_ERROR "Unable to locate cURL. Set CURL_ROOT to your installation (currently '${CURL_ROOT}').")
	endif()

	set(CURL_INCLUDE_DIRS ${CURL_INCLUDE_DIR})
	set(CURL_LIBRARIES ${CURL_LIBRARY})
endif()

add_executable(test
	lib/cpp/test.cpp)

target_include_directories(test PRIVATE ${CURL_INCLUDE_DIRS})
target_link_libraries(test PRIVATE ${CURL_LIBRARIES})

if(WIN32)
	target_link_libraries(test PRIVATE ws2_32 wldap32 crypt32 normaliz)
endif()

