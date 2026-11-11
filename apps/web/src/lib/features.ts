/**
 * Room stays on for everyone. Set NEXT_PUBLIC_ROOM_ENABLED=false only to switch the Room tab off in an emergency;
 * all Room code stays in place either way.
 */
export const ROOM_ENABLED = process.env.NEXT_PUBLIC_ROOM_ENABLED !== 'false';
