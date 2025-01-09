import { NextResponse } from "next/server";

export async function POST() {
  try {
    // @ts-ignore (global type)
    const users = global.users as Map<string, any>;
    const allUsers = Array.from(users.values());

    // Group users by their device IDs
    const deviceMap = new Map<string, any[]>();
    allUsers.forEach((user) => {
      user.devices.forEach((device: any) => {
        const existing = deviceMap.get(device.credentialID) || [];
        deviceMap.set(device.credentialID, [...existing, user]);
      });
    });

    // Keep only the most recent user for each device
    deviceMap.forEach((usersWithDevice, deviceId) => {
      if (usersWithDevice.length > 1) {
        // Sort by most recently added (assuming devices array order indicates time)
        usersWithDevice.sort((a, b) => b.devices.length - a.devices.length);

        // Keep only the most recent user, remove others
        const [keepUser, ...removeUsers] = usersWithDevice;
        removeUsers.forEach((user) => {
          users.delete(user.username);
        });
      }
    });

    return NextResponse.json({
      success: true,
      remainingUsers: Array.from(users.values()).map((u) => ({
        username: u.username,
        devices: u.devices.map((d: any) => d.credentialID),
      })),
    });
  } catch (error) {
    console.error("Error in cleanup:", error);
    return NextResponse.json(
      { error: "Failed to cleanup users" },
      { status: 500 }
    );
  }
}
