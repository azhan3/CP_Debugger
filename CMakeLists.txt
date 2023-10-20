cmake_minimum_required(VERSION 3.0)
project(YourProjectName)

set(CMAKE_CXX_STANDARD 17)            # Set C++17 standard
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Create an executable from your main file
add_executable(test lib/cpp/test.cpp)

