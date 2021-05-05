import argparse
import asyncio
import json
import time
from time import sleep
import os

from midea.client import client
from midea.device import air_conditioning_device as ac

c = client('3742e9e5842d4ad59c2db887e12449f9',os.environ.get('login'),os.environ.get('password'))

parser = argparse.ArgumentParser()
parser.add_argument("cmd")
parser.add_argument('-id', type=int,required=False)
parser.add_argument('-temp', type=int, required=False)
parser.add_argument('-power', type=bool, required=False)
parser.add_argument('-mode', type=int, required=False)
parser.add_argument('-speed', type=int, required=False)
parser.add_argument('-swing', type=int, required=False)


args = parser.parse_args()

def AcModeToInt(mode: ac.operational_mode_enum):
    if mode == ac.operational_mode_enum.cool: return 0
    elif mode == ac.operational_mode_enum.heat: return 1
    elif mode == ac.operational_mode_enum.dry: return 2
    elif mode == ac.operational_mode_enum.fan_only: return 3
    elif mode == ac.operational_mode_enum.auto: return 4

def FanSpeedToInt(speed: ac.fan_speed_enum):
    if speed == ac.fan_speed_enum.Low: return 0
    elif speed == ac.fan_speed_enum.Medium: return 1
    elif speed == ac.fan_speed_enum.High: return 2
    elif speed == ac.fan_speed_enum.Auto: return 3

def SwingModeToInt(mode: ac.swing_mode_enum):
    if mode == ac.swing_mode_enum.Off: return 0
    elif mode == ac.swing_mode_enum.Horizontal: return 1
    elif mode == ac.swing_mode_enum.Vertical: return 2
    elif mode == ac.swing_mode_enum.Both: return 3

# # print(devices)
devices = []
def listDevices():
    global devices
    try:
        devices = c.devices()
        deviceDict = {}
    except ValueError:
        print('Try again in few hours')
        print('ERR')
        return

    for device in devices:
        d = {
            'id': int(device.id),
            'name': device.name,
            'isOn': device.power_state,
            # 'audible_feedback': device.audible_feedback,
            'targetTemp': device.target_temperature,
            'outdoorTemp': device.outdoor_temperature,
            'indoorTemp': device.indoor_temperature,
            'mode': AcModeToInt(device.operational_mode),
            'fanSpeed': FanSpeedToInt(device.fan_speed),
            'swingMode': SwingModeToInt(device.swing_mode),
            'eco': device.eco_mode,
            'turbo': device.turbo_mode,
#             'online': device.onlineStatus,
            'timestamp': int(time.time() * 1000),
            'type': 1
        }
        deviceDict[d['id']] = d
        
    with open('result.json', 'w') as fp:
        json.dump(deviceDict, fp, indent=4)

def ChangeDevice(id: int, power: bool, temp:int, mode: ac.operational_mode_enum, swing: ac.swing_mode_enum, eco: bool, turbo:bool, fan: ac.fan_speed_enum):
    global devices
    for device in devices:
        if str(device.id) == str(id):
            device.power_state = power
            print('PowerState: ' + str(power))
            if power:
                device.fan_speed = fan
                device.swing_mode = swing
                device.operational_mode = mode
                device.eco_mode = eco
                device.turbo_mode = turbo
                device.target_temperature = temp
            device.apply()
            print('changing ' + device.name, flush=True)
            break




def main():
    if args.cmd == 'list':
        listDevices()
    elif args.cmd == 'change':
        ChangeDevice(args.id, args.power, args.temp, args.mode, args.swing, args.eco, False, args.fan)
    elif args.cmd == 'listen':
        # asyncio.get_event_loop().run_forever(Refresh())
        while True:
            print('READY', flush=True)
            cmd = input().split()
            if cmd[0] == 'exit':
                quit()
            elif cmd[0] == 'change':
                try:
                    ChangeDevice(int(cmd[1]), bool(int(cmd[2])), int(cmd[3]), ac.operational_mode_enum(int(cmd[4])), ac.swing_mode_enum(int(cmd[5])), bool(int(cmd[6])), bool(int(cmd[7])), ac.fan_speed_enum(int(cmd[8])))
                    listDevices()
                except RecursionError:
                    print('Failed to set device, try again', flush=True)
                    print('ERR')
                    continue
#                 except ValueError:
#                     print('Device offline', flush=True)
#                     print('ERR')
#                     continue
            elif cmd[0] == 'list':
                listDevices()
            elif cmd[0] == 'ready':
                print('READY', flush=True)
            print('OK', flush=True)

if __name__ == "__main__":
    main()
