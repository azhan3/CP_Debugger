#include <bits/stdc++.h>

#include "debug.h"

using namespace std;

int main() {
    dbg("hello");
    std::vector<int> a = {1, 2, 3};
    vector<pair<int, int>> b = {{1, 2}, {2, 3}};
    vector<pair<int, string>> c = {{1, "hel\n\n\nlo"}, {2, "asdf"}};
    priority_queue<int> pq;
    pq.push(1);
    pq.push(2);
    pq.push(3);
    stack<int> st;
    st.push(1);
    st.push(2);
    st.push(3);

    dbg(a, b, c, pq, st);
    pq.pop();
    st.pop();
    dbg(a, b, c, pq, st);

    int d[] = {1, 2, 3};
    dbg(vector<int>(d, d + 3));
}