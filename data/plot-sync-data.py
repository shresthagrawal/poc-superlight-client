import json
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import math


with open('./sync-data.json') as d:
    sync_data = np.array(json.load(d))

# perm = np.argsort(sync_data[:, 1])
# sorted_sync_data = sync_data[perm]
# plt.plot(sorted_sync_data[:, 1])
# plt.show()
# print(sync_data)

# participation_count = np.zeros(512)
# for e in sync_data:
#     participation_count[e[1]] += 1

# participation_count_c = np.cumsum(participation_count)
# plt.plot(participation_count_c)
# plt.show()

# consecutive_bad_slot_count = {}
# is_slot_good = lambda sync_count: sync_count * 3 >= 2 * 512
# assign_increment = lambda _dict, key: _dict[key] + 1 if key in _dict else 1
# last_slot, last_slot_sync_count = sync_data[0]
# last_slot_good = is_slot_good(last_slot_sync_count)
# for e in sync_data[1:]:
#     current_slot, current_slot_sync_count = e
#     current_slot_good = is_slot_good(current_slot_sync_count)
#     bad_slots = current_slot - last_slot - 1
    
#     if last_slot_good:
#         consecutive_bad_slot_count[bad_slots] = assign_increment(consecutive_bad_slot_count, bad_slots)
#         last_slot = current_slot
#         last_slot_good = current_slot_good
#     else:
#         if current_slot_good:
#             consecutive_bad_slot_count[bad_slots + 1] = assign_increment(consecutive_bad_slot_count, bad_slots + 1)
#             last_slot = current_slot
#             last_slot_good = current_slot_good

# print(consecutive_bad_slot_count)

# committee_index = sync_data[:, 0]
# committee_participation = 100.0 * sync_data[:, 1] / 512.0
# plt.plot(committee_index, committee_participation, '.')
# plt.show()

sync_map = {}
sync_count = {}
for slot in sync_data:
    period = math.floor(slot[0] / (32 * 512))
    if period not in sync_map:
        sync_count[period] = 0
        sync_map[period] = 0
    sync_map[period] += slot[1]
    sync_count[period] += 1

matplotlib.use("pgf")
matplotlib.rcParams.update({
    "pgf.texsystem": "pdflatex",
    'font.family': 'serif',
    'text.usetex': True,
    'pgf.rcfonts': False,
})

periods = np.array(list(sync_map.keys()))[1:-1]
print(len(periods))
average_participation = np.array(list(sync_map.values()))[1:-1] / (32 * 512)
# print(np.arrray(list(sync_count.values()))/ 32 * 512)
plt.plot(periods, average_participation, '.', label='Average Committee participation')
plt.axhline(y=(2.0 * 512.0) / 3.0, color='r', linestyle='-', label='2/3 * committee size(512)')
plt.xlabel('Sync Period')
plt.ylabel('Average Sync Committee participation')
plt.legend()
# plt.show()
plt.savefig('committee-participation.pgf')
