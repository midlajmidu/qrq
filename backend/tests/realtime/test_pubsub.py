"""
tests/realtime/test_pubsub.py
Phase 4 — Redis Pub/Sub integration tests.

Tests:
  - Publish → subscriber receives
  - Channel isolation (message on ch_a doesn't hit ch_b)
  - Connection manager receives broadcast from Redis
"""
import asyncio
import json
import uuid

import pytest
import redis.asyncio as aioredis

from app.core.config import get_settings
from app.websocket.connection_manager import ConnectionManager, manager
from app.websocket.pubsub import publish_queue_update

settings = get_settings()


class TestRedisPubSub:

    async def test_publish_message_received_by_subscriber(self):
        """Directly test Redis publish/subscribe round-trip."""
        channel = f"org_{uuid.uuid4().hex[:8]}_queue_{uuid.uuid4().hex[:8]}"
        received = []

        # Create a dedicated subscriber
        sub_redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        pub_redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

        pubsub = sub_redis.pubsub()
        await pubsub.subscribe(channel)

        # Publish a message
        payload = {"type": "queue_update", "serving": 42}
        await publish_queue_update(pub_redis, channel=channel, payload=payload)

        # Read messages (with timeout)
        for _ in range(20):
            msg = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=0.1
            )
            if msg and msg["type"] == "message":
                received.append(json.loads(msg["data"]))
                break
            await asyncio.sleep(0.05)

        assert len(received) == 1
        assert received[0]["type"] == "queue_update"
        assert received[0]["serving"] == 42

        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await sub_redis.aclose()
        await pub_redis.aclose()

    async def test_channel_isolation_no_cross_channel_leak(self):
        """Message on channel_a must NOT appear on channel_b."""
        ch_a = f"org_aaa_queue_{uuid.uuid4().hex[:8]}"
        ch_b = f"org_bbb_queue_{uuid.uuid4().hex[:8]}"

        sub_redis = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
        pub_redis = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

        pubsub_b = sub_redis.pubsub()
        await pubsub_b.subscribe(ch_b)

        # Publish to channel_a
        await publish_queue_update(
            pub_redis, channel=ch_a, payload={"type": "secret"}
        )

        leaked = []
        for _ in range(10):
            msg = await pubsub_b.get_message(
                ignore_subscribe_messages=True, timeout=0.1
            )
            if msg and msg["type"] == "message":
                leaked.append(msg)
            await asyncio.sleep(0.05)

        assert len(leaked) == 0, f"Cross-channel leak detected: {leaked}"

        await pubsub_b.unsubscribe(ch_b)
        await pubsub_b.aclose()
        await sub_redis.aclose()
        await pub_redis.aclose()

    async def test_publish_with_redis_down_does_not_crash(self):
        """If Redis is unreachable, publish should log error, not raise."""
        fake_redis = aioredis.from_url(
            "redis://nonexistent-host:9999/0",
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=1,
        )

        # This should NOT raise — just log an error
        await publish_queue_update(
            fake_redis,
            channel="test_channel",
            payload={"type": "test"},
        )
        # Test passes if no exception

        await fake_redis.aclose()

    async def test_multiple_rapid_publishes(self):
        """100 rapid publishes should all arrive."""
        channel = f"org_rapid_queue_{uuid.uuid4().hex[:8]}"
        sub_redis = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
        pub_redis = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

        pubsub = sub_redis.pubsub()
        await pubsub.subscribe(channel)

        # Publish 100 messages
        for i in range(100):
            await publish_queue_update(
                pub_redis, channel=channel, payload={"i": i}
            )

        received = []
        for _ in range(200):
            msg = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=0.1
            )
            if msg and msg["type"] == "message":
                received.append(json.loads(msg["data"]))
            if len(received) >= 100:
                break
            await asyncio.sleep(0.01)

        assert len(received) == 100
        indices = [r["i"] for r in received]
        assert sorted(indices) == list(range(100))

        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await sub_redis.aclose()
        await pub_redis.aclose()
