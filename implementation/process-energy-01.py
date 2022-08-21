#!/usr/bin/env python3

import re
import time

N_slc = 25
N_lc = 5
N_olc = 25

idx_slc = 2
idx_lc = 4
idx_olc = 6
idx_idle = 7

data = open("results/energy-01/log.txt").read()

energies = re.findall(r"energy:\s*([0-9]*\.[0-9]*) Wh", data)
datetimes = re.findall(r"updated:\s*([A-Z].*? PDT) ", data)

print(energies)
print(datetimes)

energies = [ float(w) for w in energies ]
datetimes = [ time.strptime(d, "%a %d %b %Y %I:%M:%S %p %Z") for d in datetimes ]
datetimes = [ time.mktime(d) for d in datetimes ]

print(energies)
print(datetimes)

t_SLC = (datetimes[idx_slc] - datetimes[idx_slc-1]) / N_slc
t_LC = (datetimes[idx_lc] - datetimes[idx_lc-1]) / N_lc
t_OLC = (datetimes[idx_olc] - datetimes[idx_olc-1]) / N_olc
t_idle = datetimes[idx_idle] - datetimes[idx_idle-1]

E_SLC = (energies[idx_slc-1] - energies[idx_slc]) / N_slc
E_LC = (energies[idx_lc-1] - energies[idx_lc]) / N_lc
E_OLC = (energies[idx_olc-1] - energies[idx_olc]) / N_olc
E_idle = energies[idx_idle-1] - energies[idx_idle]

print("Time idle [s]:", t_idle)
print("Time LC [s]:", t_LC)
print("Time OLC [s]:", t_OLC)
print("Time SLC [s]:", t_SLC)

print("Energy idle [Wh]:", E_idle)
print("Energy LC [Wh]:", E_LC)
print("Energy OLC [Wh]:", E_OLC)
print("Energy SLC [Wh]:", E_SLC)

print("Power idle [W]:", E_idle * 3600 / t_idle)
print("Power LC [W]:", E_LC * 3600 / t_LC)
print("Power OLC [W]:", E_OLC * 3600 / t_OLC)
print("Power SLC [W]:", E_SLC * 3600 / t_SLC)

