#include <algorithm>
#include <cmath>
#include <curl/curl.h>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <vector>

#include "debug.h"

using namespace std;


std::istream *resolve_input_stream(int argc, char **argv, std::ifstream &file) {
    if (argc > 1) {
        file.open(argv[1]);
        if (!file.is_open()) {
            std::cerr << "Failed to open input file: " << argv[1] << std::endl;
        }
    }

    if (!file.is_open()) {
        std::vector<std::filesystem::path> candidates = {
            std::filesystem::path("lib/cpp/sample_small.in"),
            std::filesystem::path("../lib/cpp/sample_small.in"),
            std::filesystem::path("../../lib/cpp/sample_small.in")
        };

        for (const auto &candidate : candidates) {
            file.open(candidate);
            if (file.is_open()) {
                break;
            }
        }
    }

    if (file.is_open()) {
        std::cerr << "Using static input file." << std::endl;
        return &file;
    }

    if (!std::cin.good()) {
        std::cerr << "No input provided. Supply an input file or pipe data to the program." << std::endl;
    }
    return &std::cin;
}


int main(int argc, char **argv) {
    std::ifstream file;
    std::istream *input_stream = resolve_input_stream(argc, argv, file);
    std::istream &in = *input_stream;

    int n, m;
    if (!(in >> n >> m)) {
        std::cerr << "Failed to read graph dimensions from input." << std::endl;
        return 1;
    }

    vector<int> c(n);
    for (auto &i : c) {
        if (!(in >> i)) {
            std::cerr << "Failed to read cost vector." << std::endl;
            return 1;
        }
    }

    vector<vector<int>> adj(n);
    for (int i = 0 ; i < m ; ++i) {
        int u, v;
        if (!(in >> u >> v)) {
            std::cerr << "Failed to read edge " << i << std::endl;
            return 1;
        }
        u--; v--;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    vector<vector<int>> adj2 = {{1, 2}, {2}, {0}};
    dbg(graph(adj), graph(adj2, "adj2 sample"));
    dbg(adj);
    vector<int>test = {1,2,3,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,55,5,5,5,5,5,5,5,5,5,5,};
    dbg(test, 6, "TESTING");
    int cnt = 0;
    while (true) {
        if (cnt == 5) {
            break;
        }
        dbg(test, 6, "TESTING");
        for (int i = 0 ; i < 10 ; i++) {
            dbg(test, 6, "TESTING");
        }
        cnt++;
    }
    dbg(graph(adj), adj);

    return 0;
}
