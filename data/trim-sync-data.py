from glob import glob
import json
import binascii

files = glob('./slots/*.json')
fetched_slots = [int(file[8: -5]) for file in files]
fetched_slots.sort()

sync_data = []

for slot in fetched_slots:
    with open('./slots/{}.json'.format(slot)) as slot_raw:
        slot_json = json.load(slot_raw)
        participation_bits = slot_json['body']['sync_aggregate']['sync_committee_bits']
        binary_string = bin(int(participation_bits[2:], 16))[2:]
        count = 0
        for bi in binary_string:
            if bi == '1':
                count += 1
        sync_data.append([slot, count])

with open('./sync-data.json', 'w') as f:
    f.write(json.dumps(sync_data))