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
    std::map<int, std::vector<int>> adj_map = {
        {10, {11, 12}},
        {11, {10}},
        {12, {10}}
    };
    std::vector<std::vector<std::pair<int, int>>> weighted_adj(n);
    for (int i = 0; i < n; ++i) {
        for (int j : adj[i]) {
            weighted_adj[i].push_back({j, (i + j) % 5 + 1});
        }
    }
    std::map<int, std::vector<std::pair<int, int>>> weighted_map = {
        {20, {{21, 3}, {22, 7}}},
        {21, {{22, 2}}},
        {22, {{20, 5}}}
    };
    // A larger, more interesting weighted graph (~20 nodes)
    std::vector<std::vector<std::pair<int,int>>> weighted20(20);
    auto add_edge = [&weighted20](int u, int v, int w) {
        if (u < 0 || u >= (int)weighted20.size() || v < 0 || v >= (int)weighted20.size()) return;
        weighted20[u].push_back({v, w});
        weighted20[v].push_back({u, w});
    };

    add_edge(0, 1, 4);
    add_edge(0, 2, 5);
    add_edge(1, 3, 2);
    add_edge(1, 4, 6);
    add_edge(2, 5, 3);
    add_edge(2, 6, 7);
    add_edge(3, 7, 8);
    add_edge(4, 7, 1);
    add_edge(5, 8, 4);
    add_edge(6, 9, 2);
    add_edge(7, 10, 5);
    add_edge(8, 11, 3);
    add_edge(9, 12, 6);
    add_edge(10, 13, 2);
    add_edge(11, 14, 9);
    add_edge(12, 15, 4);
    add_edge(13, 16, 1);
    add_edge(14, 17, 7);
    add_edge(15, 18, 3);
    add_edge(16, 19, 5);
    // extra cross links to make the topology richer
    add_edge(3, 5, 4);
    add_edge(4, 6, 2);
    add_edge(8, 9, 6);
    add_edge(14, 19, 8);
    dbg(
        graph(adj, "adj"),
        graph(adj2, "adj2 sample"),
        graph(adj_map, "adj map"),
        graph(weighted_adj, "weighted adj"),
        graph(weighted_map, "weighted map"));
    dbg(graph(weighted20, "weighted20 adj"));
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
    priority_queue<int>pq;
    pq.push(5);
    pq.push(3);
    dbg(pq);
    return 0;
}
