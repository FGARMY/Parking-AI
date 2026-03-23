import asyncio
import websockets

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            # Send small dummy data
            await websocket.send(b"test")
            print("Sent data.")
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(test_ws())
