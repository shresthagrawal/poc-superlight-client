from dotenv import load_dotenv
load_dotenv() 

import os
import asyncio
import aiohttp
import json
from glob import glob

infura_username = os.getenv('INFURA_USERNAME')
infura_password = os.getenv('INFURA_PASSWORD')
altair_start_slot = 2375680
current_slot = 3574047
batch_size = 100 

get_url = lambda slot: 'https://{}:{}@eth2-beacon-mainnet.infura.io/eth/v2/beacon/blocks/{}'.format(infura_username, infura_password, slot)

async def fetch_slot(_slot):
    async with aiohttp.ClientSession() as session:
        async with session.get(get_url(_slot)) as res:
            body = await res.json()
            if (res.status == 200):
                slot_info = body['data']['message']
                with open('slots/{}.json'.format(_slot), 'w') as f:
                    f.write(json.dumps(slot_info))
                print('slot({}) saved'.format(_slot))
            else:
                print(body)

async def main():
    try:
        files = glob('./slots/*.json')
        fetched_slots = [int(file[8: -5]) for file in files]
        fetched_slots.sort()
        last_fetched_slot = altair_start_slot if len(fetched_slots) == 0 else fetched_slots[-1]  

        for batch_start in range (last_fetched_slot, current_slot, batch_size):
            batch_slots = range(batch_start, batch_start + batch_size)
            promises = list(map(fetch_slot, batch_slots)) 
            await asyncio.gather(*promises)
    except Exception as e:
        print(e)
        asyncio.sleep(100)
        await main()

asyncio.run(main())
