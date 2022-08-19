#!/usr/bin/env python

import json
from collections import defaultdict

beacon_data_file = 'results/aggregate-experiment-23.json'
beacon_data_file_2 = 'results/experiment-2.json'
beacon_data_file_3 = 'results/experiment-3.json'

with open(beacon_data_file_2) as d2:
    with open(beacon_data_file_3) as d3:
        beacon_benchmarks_2 = json.load(d2)
        beacon_benchmarks_3 = json.load(d3)
        d = beacon_benchmarks_2 + beacon_benchmarks_3
        json.dump(d, open(beacon_data_file, 'w'))

with open(beacon_data_file) as d:
    beacon_benchmarks = json.load(d)

results = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: { 'N': 0, 'delay': 0.0, 'bandwidth': 0.0 })))

for b in beacon_benchmarks:
    _t = b['type']
    _n = b['chainSize']

    if b['type'] == 'optimisticlight':
        _p = b['batchSize']
    elif b['type'] == 'superlight':
        _p = b['treeDegree']
    elif b['type'] == 'light':
        _p = b['batchSize']
    else:
        raise NotImplementedError
    
    results[_t][_n][_p]['N'] += 1
    results[_t][_n][_p]['delay'] += b['timeToSync']
    results[_t][_n][_p]['bandwidth'] += b['bytesDownloaded']
    results[_t][_n][_p]['bandwidth'] += b['bytesUploaded']


for (_t, _p) in [('optimisticlight', 20), ('superlight', 2)]:
    print("#", _t)
    print("label", "execution_horizon", "delay", "bandwidth", "style", "comment")
    for _n in results[_t].keys():
        _delay = results[_t][_n][_p]['delay'] / results[_t][_n][_p]['N']
        _bandwidth = results[_t][_n][_p]['bandwidth'] / results[_t][_n][_p]['N']
        if _t == 'optimisticlight' or _t == 'light':
            _param_label = 'b'
        elif _t == 'superlight':
            _param_label = 'd'
        else:
            raise NotImplementedError
        print("{}", _n, _delay / 1e3, _bandwidth / 1e6, "{}", f"${_param_label}={_p}$")

