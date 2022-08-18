#!/usr/bin/env python3

import re
import time

N = 1

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

t_SLC = (datetimes[2] - datetimes[1]) / N
t_LC = (datetimes[3] - datetimes[2]) / N
t_OLC = (datetimes[4] - datetimes[3]) / N
t_idle = datetimes[5] - datetimes[4]

E_SLC = (energies[1] - energies[2]) / N
E_LC = (energies[2] - energies[3]) / N
E_OLC = (energies[3] - energies[4]) / N
E_idle = energies[4] - energies[5]

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

