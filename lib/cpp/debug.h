#ifndef DEBUG_H
#define DEBUG_H

#include <stdlib.h>
#include <sys/types.h>

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <deque>
#include <fstream>
#include <initializer_list>
#include <iostream>
#include <map>
#include <ostream>
#include <queue>
#include <sstream>
#include <stack>
#include <string>
#include <type_traits>
#include <vector>

#ifdef CPDBG_ENABLE_CURL
#include <curl/curl.h>
#endif

using std::begin;
using std::decay_t;
using std::declval;
using std::deque;
using std::enable_if;
using std::enable_if_t;
using std::initializer_list;
using std::is_convertible;
using std::is_floating_point;
using std::is_integral;
using std::is_same;
using std::map;
using std::pair;
using std::priority_queue;
using std::queue;
using std::reverse;
using std::stack;
using std::string;
using std::vector;


inline string json_escape(const string &str) {
    string output;
    for (unsigned i = 0; i < str.length(); ++i) switch (str[i]) {
            case '\"':
                output += "\\\"";
                break;
            case '\\':
                output += "\\\\";
                break;
            case '\b':
                output += "\\b";
                break;
            case '\f':
                output += "\\f";
                break;
            case '\n':
                output += "\\n";
                break;
            case '\r':
                output += "\\r";
                break;
            case '\t':
                output += "\\t";
                break;
            default:
                output += str[i];
                break;
        }
    return output;
}

class JSON {
    union BackingData {
        BackingData(double d) : Float(d) {
        }
        BackingData(long l) : Int(l) {
        }
        BackingData(bool b) : Bool(b) {
        }
        BackingData(string s) : String(new string(s)) {
        }
        BackingData() : Int(0) {
        }

        deque<JSON> *List;
        map<string, JSON> *Map;
        string *String;
        double Float;
        long Int;
        bool Bool;
    } Internal;

   public:
    enum class Class {
        Null,
        Object,
        Array,
        String,
        Floating,
        Integral,
        Boolean
    };

    JSON() : Internal(), Type(Class::Null) {
    }

    ~JSON() {
        ClearInternal();
    }

    JSON(initializer_list<JSON> list) : JSON() {
        SetType(Class::Object);
        for (auto i = list.begin(), e = list.end(); i != e; ++i, ++i)
            operator[](i->ToString()) = *std::next(i);
    }

    JSON(JSON &&other) : Internal(other.Internal), Type(other.Type) {
        other.Type = Class::Null;
        other.Internal.Map = nullptr;
    }

    JSON &operator=(JSON &&other) {
        ClearInternal();
        Internal = other.Internal;
        Type = other.Type;
        other.Internal.Map = nullptr;
        other.Type = Class::Null;
        return *this;
    }

    JSON(const JSON &other) {
        switch (other.Type) {
            case Class::Object:
                Internal.Map = new map<string, JSON>(
                    other.Internal.Map->begin(), other.Internal.Map->end());
                break;
            case Class::Array:
                Internal.List = new deque<JSON>(other.Internal.List->begin(),
                                                other.Internal.List->end());
                break;
            case Class::String:
                Internal.String = new string(*other.Internal.String);
                break;
            default:
                Internal = other.Internal;
        }
        Type = other.Type;
    }

    JSON &operator=(const JSON &other) {
        ClearInternal();
        switch (other.Type) {
            case Class::Object:
                Internal.Map = new map<string, JSON>(
                    other.Internal.Map->begin(), other.Internal.Map->end());
                break;
            case Class::Array:
                Internal.List = new deque<JSON>(other.Internal.List->begin(),
                                                other.Internal.List->end());
                break;
            case Class::String:
                Internal.String = new string(*other.Internal.String);
                break;
            default:
                Internal = other.Internal;
        }
        Type = other.Type;
        return *this;
    }

    template <typename T>
    JSON(T b, typename enable_if<is_same<T, bool>::value>::type * = 0)
        : Internal(b), Type(Class::Boolean) {
    }

    template <typename T>
    JSON(T i, typename enable_if<is_integral<T>::value &&
                                 !is_same<T, bool>::value>::type * = 0)
        : Internal((long)i), Type(Class::Integral) {
    }

    template <typename T>
    JSON(T f, typename enable_if<is_floating_point<T>::value>::type * = 0)
        : Internal((double)f), Type(Class::Floating) {
    }

    template <typename T>
    JSON(T s, typename enable_if<is_convertible<T, string>::value>::type * = 0)
        : Internal(string(s)), Type(Class::String) {
    }

    template <typename K, typename V>
    JSON(pair<K, V> p) : JSON() {
        SetType(Class::Array);
        operator[](0) = JSON(p.first);
        operator[](1) = JSON(p.second);
    }

    template <typename T, typename = decay_t<decltype(*begin(declval<T>()))>,
              typename = enable_if_t<!is_same<T, string>::value>>
    JSON(T obj) : JSON() {
        SetType(Class::Array);
        int ind = 0;
        for (auto it = obj.begin(); it != obj.end(); it++) {
            operator[](ind++) = JSON(*it);
        }
    }

    template <class T>
    JSON(const queue<T> &q) : JSON() {
        queue<T> obj(q);
        vector<T> t;
        while (!obj.empty()) t.push_back(obj.front()), obj.pop();
        int ind = 0;
        for (auto it = t.begin(); it != t.end(); it++) {
            operator[](ind++) = JSON(*it);
        }
    }

    template <class T>
    JSON(const stack<T> &s) : JSON() {
        stack<T> obj(s);
        vector<T> t;
        while (!obj.empty()) t.push_back(obj.top()), obj.pop();
        reverse(t.begin(), t.end());
        int ind = 0;
        for (auto it = t.begin(); it != t.end(); it++) {
            operator[](ind++) = JSON(*it);
        }
    }

    template <class T>
    JSON(const priority_queue<T> &q) : JSON() {
        priority_queue<T> obj(q);
        vector<T> t;
        while (!obj.empty()) t.push_back(obj.top()), obj.pop();
        int ind = 0;
        for (auto it = t.begin(); it != t.end(); it++) {
            operator[](ind++) = JSON(*it);
        }
    }

    JSON(std::nullptr_t) : Internal(), Type(Class::Null) {
    }

    static JSON Make(Class type) {
        JSON ret;
        ret.SetType(type);
        return ret;
    }

    static JSON Load(const string &);

    template <typename T>
    void append(T arg) {
        SetType(Class::Array);
        Internal.List->emplace_back(arg);
    }

    template <typename T, typename... U>
    void append(T arg, U... args) {
        append(arg);
        append(args...);
    }

    template <typename T>
    typename enable_if<is_same<T, bool>::value, JSON &>::type operator=(T b) {
        SetType(Class::Boolean);
        Internal.Bool = b;
        return *this;
    }

    template <typename T>
    typename enable_if<is_integral<T>::value && !is_same<T, bool>::value,
                       JSON &>::type
    operator=(T i) {
        SetType(Class::Integral);
        Internal.Int = i;
        return *this;
    }

    template <typename T>
    typename enable_if<is_floating_point<T>::value, JSON &>::type operator=(
        T f) {
        SetType(Class::Floating);
        Internal.Float = f;
        return *this;
    }

    template <typename T>
    typename enable_if<is_convertible<T, string>::value, JSON &>::type
    operator=(T s) {
        SetType(Class::String);
        *Internal.String = string(s);
        return *this;
    }

    JSON &operator[](const string &key) {
        SetType(Class::Object);
        return Internal.Map->operator[](key);
    }

    JSON &operator[](unsigned index) {
        SetType(Class::Array);
        if (index >= Internal.List->size()) Internal.List->resize(index + 1);
        return Internal.List->operator[](index);
    }

    JSON &at(const string &key) {
        return operator[](key);
    }

    const JSON &at(const string &key) const {
        return Internal.Map->at(key);
    }

    JSON &at(unsigned index) {
        return operator[](index);
    }

    const JSON &at(unsigned index) const {
        return Internal.List->at(index);
    }

    int length() const {
        if (Type == Class::Array)
            return Internal.List->size();
        else
            return -1;
    }

    bool hasKey(const string &key) const {
        if (Type == Class::Object)
            return Internal.Map->find(key) != Internal.Map->end();
        return false;
    }

    int size() const {
        if (Type == Class::Object)
            return Internal.Map->size();
        else if (Type == Class::Array)
            return Internal.List->size();
        else
            return -1;
    }

    Class JSONType() const {
        return Type;
    }

    /// Functions for getting primitives from the JSON object.
    bool IsNull() const {
        return Type == Class::Null;
    }

    string ToString() const {
        bool b;
        return ToString(b);
    }
    string ToString(bool &ok) const {
        ok = (Type == Class::String);
        return ok ? std::move(json_escape(*Internal.String)) : string("");
    }

    double ToFloat() const {
        bool b;
        return ToFloat(b);
    }
    double ToFloat(bool &ok) const {
        ok = (Type == Class::Floating);
        return ok ? Internal.Float : 0.0;
    }

    long ToInt() const {
        bool b;
        return ToInt(b);
    }
    long ToInt(bool &ok) const {
        ok = (Type == Class::Integral);
        return ok ? Internal.Int : 0;
    }

    bool ToBool() const {
        bool b;
        return ToBool(b);
    }
    bool ToBool(bool &ok) const {
        ok = (Type == Class::Boolean);
        return ok ? Internal.Bool : false;
    }

    string dump(int depth = 1, string tab = "  ") const {
        string pad = "";
        for (int i = 0; i < depth; ++i, pad += tab)
            ;

        switch (Type) {
            case Class::Null:
                return "null";
            case Class::Object: {
                string s = "{\n";
                bool skip = true;
                for (auto &p : *Internal.Map) {
                    if (!skip) s += ",\n";
                    s += (pad + "\"" + p.first +
                          "\" : " + p.second.dump(depth + 1, tab));
                    skip = false;
                }
                s += ("\n" + pad.erase(0, 2) + "}");
                return s;
            }
            case Class::Array: {
                string s = "[";
                bool skip = true;
                for (auto &p : *Internal.List) {
                    if (!skip) s += ", ";
                    s += p.dump(depth + 1, tab);
                    skip = false;
                }
                s += "]";
                return s;
            }
            case Class::String:
                return "\"" + json_escape(*Internal.String) + "\"";
            case Class::Floating:
                return std::to_string(Internal.Float);
            case Class::Integral:
                return std::to_string(Internal.Int);
            case Class::Boolean:
                return Internal.Bool ? "true" : "false";
            default:
                return "";
        }
        return "";
    }

    friend std::ostream &operator<<(std::ostream &, const JSON &);

   private:
    void SetType(Class type) {
        if (type == Type) return;

        ClearInternal();

        switch (type) {
            case Class::Null:
                Internal.Map = nullptr;
                break;
            case Class::Object:
                Internal.Map = new map<string, JSON>();
                break;
            case Class::Array:
                Internal.List = new deque<JSON>();
                break;
            case Class::String:
                Internal.String = new string();
                break;
            case Class::Floating:
                Internal.Float = 0.0;
                break;
            case Class::Integral:
                Internal.Int = 0;
                break;
            case Class::Boolean:
                Internal.Bool = false;
                break;
        }

        Type = type;
    }

   private:
    /* beware: only call if YOU know that Internal is allocated. No checks
      performed here. This function should be called in a constructed JSON
      just before you are going to overwrite Internal...
    */
    void ClearInternal() {
        switch (Type) {
            case Class::Object:
                delete Internal.Map;
                break;
            case Class::Array:
                delete Internal.List;
                break;
            case Class::String:
                delete Internal.String;
                break;
            default:;
        }
    }

   private:
    Class Type = Class::Null;
};

inline std::ostream &operator<<(std::ostream &os, const JSON &json) {
    os << json.dump();
    return os;
}

inline string trim_arg(const string &value) {
    auto is_space = [](unsigned char ch) { return std::isspace(ch) != 0; };
    auto start = std::find_if(value.begin(), value.end(),
                              [&](unsigned char ch) { return !is_space(ch); });
    auto end = std::find_if(value.rbegin(), value.rend(),
                            [&](unsigned char ch) { return !is_space(ch); })
                   .base();
    if (start >= end) {
        return string();
    }
    return string(start, end);
}

inline vector<string> split_args(const string &s) {
    vector<string> args;
    string current;
    int depth = 0;
    bool quoted = false;

    for (size_t i = 0; i < s.size(); ++i) {
        char ch = s[i];
        if (ch == '\\' && i + 1 < s.size()) {
            current.push_back(ch);
            current.push_back(s[++i]);
            continue;
        }

        if (ch == '\"') {
            quoted = !quoted;
            current.push_back(ch);
            continue;
        }

        if (!quoted) {
            if (ch == '(') {
                depth++;
            } else if (ch == ')' && depth > 0) {
                depth--;
            } else if (ch == ',' && depth == 0) {
                args.push_back(trim_arg(current));
                current.clear();
                continue;
            }
        }

        current.push_back(ch);
    }

    if (!current.empty() || !args.empty()) {
        args.push_back(trim_arg(current));
    }

    return args;
}

inline string normalize_debug_id(string raw) {
    auto isSpace = [](unsigned char ch) { return std::isspace(ch); };
    raw.erase(raw.begin(),
              std::find_if(raw.begin(), raw.end(),
                           [&](unsigned char ch) { return !isSpace(ch); }));
    raw.erase(std::find_if(raw.rbegin(), raw.rend(),
                           [&](unsigned char ch) { return !isSpace(ch); })
                  .base(),
              raw.end());
    return raw;
}

inline string extract_graph_label(const string &raw) {
    const string prefix = "graph(";
    if (raw.rfind(prefix, 0) == 0 && raw.size() > prefix.size() + 1 &&
        raw.back() == ')') {
        string inner = raw.substr(prefix.size(), raw.size() - prefix.size() - 1);
        return normalize_debug_id(inner);
    }
    return "";
}

struct GraphDebugValue {
    JSON adjacency;
    std::string explicit_label;
};

template <typename T>
GraphDebugValue graph(const T &adjacency, std::string label = "") {
    GraphDebugValue wrapper;
    wrapper.adjacency = JSON(adjacency);
    wrapper.explicit_label = label;
    return wrapper;
}

template <typename T>
void append_debug_value(JSON &content, const string &rawId, const T &value) {
    string normalizedId = normalize_debug_id(rawId);
    JSON entry = JSON::Make(JSON::Class::Object);
    entry["id"] = normalizedId;
    entry["value"] = JSON(value);
    content.append(entry);
}

inline void append_debug_value(JSON &content, const string &rawId,
                               const GraphDebugValue &graphValue) {
    string normalizedId = normalize_debug_id(rawId);
    string resolvedLabel = normalizedId;

    if (!graphValue.explicit_label.empty()) {
        resolvedLabel = graphValue.explicit_label;
    } else {
        string extracted = extract_graph_label(normalizedId);
        if (!extracted.empty()) {
            resolvedLabel = extracted;
        }
    }

    JSON graphJson = JSON::Make(JSON::Class::Object);
    graphJson["__type"] = string("graph");
    graphJson["adjacency"] = graphValue.adjacency;
    graphJson["rawId"] = normalizedId;
    graphJson["label"] = resolvedLabel;

    JSON entry = JSON::Make(JSON::Class::Object);
    entry["id"] = resolvedLabel;
    entry["value"] = graphJson;
    content.append(entry);
}

namespace cpdbg {

struct DebugState {
    bool flush_registered = false;
    bool source_loaded = false;
    JSON entries;
    string source_code;
    string source_path;
    string output_path;
    string session_id;
    string http_url;
    bool warned_no_http = false;
#ifdef CPDBG_ENABLE_CURL
    bool curl_initialized = false;
#endif
};

inline DebugState state;

inline string resolve_output_path() {
    if (!state.output_path.empty()) {
        return state.output_path;
    }
    const char *env_path = std::getenv("CPDBG_OUTPUT_PATH");
    if (env_path && *env_path) {
        return string(env_path);
    }
    return string("debug_output.json");
}

inline string resolve_http_url() {
    if (!state.http_url.empty()) {
        return state.http_url;
    }
    const char *env_url = std::getenv("CPDBG_HTTP_URL");
    if (env_url && *env_url) {
        return string(env_url);
    }
    return string();
}

inline void set_output_path(const string &path) {
    state.output_path = path;
}

inline void set_session_id(const string &id) {
    state.session_id = id;
}

inline void set_http_endpoint(const string &url) {
    state.http_url = url;
}

inline void ensure_source_loaded(const char *file_path) {
    if (state.source_loaded)
        return;

    if (file_path)
        state.source_path = file_path;

    if (!file_path) {
        state.source_loaded = true;
        return;
    }

    std::ifstream in(file_path, std::ios::in | std::ios::binary);
    if (!in) {
        state.source_code.clear();
        state.source_loaded = true;
        return;
    }

    std::ostringstream ss;
    ss << in.rdbuf();
    state.source_code = ss.str();
    state.source_loaded = true;
}

inline void dbg_flush();

inline void register_flush() {
    if (state.flush_registered)
        return;
    std::atexit(dbg_flush);
    state.flush_registered = true;
}

#ifdef CPDBG_ENABLE_CURL
inline void ensure_curl_init() {
    if (state.curl_initialized) {
        return;
    }
    curl_global_init(CURL_GLOBAL_ALL);
    std::atexit(curl_global_cleanup);
    state.curl_initialized = true;
}

inline void send_http_payload(const string &url, const string &json_str) {
    ensure_curl_init();
    CURL *curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Error initializing libcurl." << std::endl;
        return;
    }

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_str.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, json_str.size());
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 2000L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 5000L);
    curl_easy_setopt(curl, CURLOPT_FAILONERROR, 1L);

    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "curl_easy_perform() failed: " << curl_easy_strerror(res)
                  << std::endl;
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
#endif

inline void dbg_flush() {
    JSON payload = JSON::Make(JSON::Class::Object);
    JSON entries_snapshot = state.entries;
    if (entries_snapshot.JSONType() == JSON::Class::Null) {
        entries_snapshot = JSON::Make(JSON::Class::Array);
    }

    payload["entries"] = entries_snapshot;

    if (!state.session_id.empty()) {
        payload["id"] = state.session_id;
    }
    if (state.source_loaded && !state.source_code.empty()) {
        payload["code"] = state.source_code;
    }
    if (!state.source_path.empty()) {
        payload["file"] = state.source_path;
    }

    string json_str = payload.dump();
    string output_path = resolve_output_path();

    if (!output_path.empty()) {
        std::ofstream out(output_path, std::ios::out | std::ios::binary);
        if (!out) {
            std::cerr << "Unable to write dbg output to " << output_path
                      << std::endl;
        } else {
            out << json_str;
        }
    }

    string http_url = resolve_http_url();
    if (!http_url.empty()) {
#ifdef CPDBG_ENABLE_CURL
        send_http_payload(http_url, json_str);
#else
        if (!state.warned_no_http) {
            std::cerr << "HTTP output requested but CPDBG_ENABLE_CURL is not set."
                      << std::endl;
            state.warned_no_http = true;
        }
#endif
    }
}

}  // namespace cpdbg




#define dbg(...)                                                           \
    [](const auto &...x) {                                                 \
        cpdbg::ensure_source_loaded(__FILE__);                             \
        JSON obj({"line", __LINE__, "file", __FILE__, "content", JSON()});   \
        vector<string> vs = split_args(#__VA_ARGS__);                      \
        size_t ind = 0;                                                    \
        (append_debug_value(obj["content"], vs[ind++], x), ...);           \
        cpdbg::state.entries.append(obj);                                  \
        cpdbg::register_flush();                                           \
    }(__VA_ARGS__)

#endif
