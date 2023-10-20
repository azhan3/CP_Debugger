#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
#include <curl/curl.h>

#include "debug.h"

using namespace std;


int main() {
    int n, m;
    cin >> n >> m;
    vector<int>c(n);
    for (auto & i : c) cin >> i;
    vector<vector<int>>adj(n);
    for (int i = 0 ; i < m ; ++i) {
        int u, v;
        cin >> u >> v;
        u--; v--;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    dbg(adj, adj);


    return 0;
}
