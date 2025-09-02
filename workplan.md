List of workplan

1) Player tracking:
We need the player data to be correctly recorded on the back end. It tracks the player sessions on the server selected Using their battlemetrics id. This is server data.

We need to integrate the tracking module into the current primary project. I have struggled with this because of the size, moving the files around without github has been a problem. I haven’t had the time to learn that site. If we can port the whole thing over I think the ai can 95% figure out how to integrate it. It almost did it correctly using a small portion of the code.

The group needs to be able to select a server to set it’s player data to and get map information from. There is a group management modal that they can access for that control.

The group needs to be able to access that information via the player tab. The player tab uses the server data but it also remembers the group information. The group information is the user generated information such as notes, player base associations, allies and reports. It also keeps track of that player's names. Since players change names a lot, but their id remains the same. So if the group meets timtom and later goes back to that players Profile to see Chadlord69 they will see in aliases that they had before including timtom.

We will need to be able to log into and use the admin portal to make sure we are tracking server data and the such.

2) Log in system
I have avoided this because I didn’t want to have to log into the preview over and over. We need to be able to make both group and individual accounts.

Users log into their account in order to access the website and keep out unwanted people.

Group accounts: Users or admin can start a group. The group has 1 user set as its primary admin. Avoiding the term leader because of group dynamics. The primary admin or anyone given admin privileges can invite others to the group. This should function kind of like discord invites.

Each squad slot has it’s own invite code. The User uses the invite code to join the group and is slotted into where they were invited in the roll they were invited.
New scout - Can make or view report and bases but not edit or delete them

Raiders - Can make, view, edit or delete reports and bases

Admin - Can make changes to Team wide settings and delete all data. Avoid giving admin roll

The user can associate a battlemetrics id or premium account with their user name to avoid confusion and make tracking easier.

3) Memory:
We need to transition some of the things the ai made session specific into the Group memory. Any text, note or tag needs to be remembered in the group data. So each member of the group sees the same notes and same marking on the map. This is something I am currently working on.

These 3 are the MVP to launch. There is a lot more I want to get done but I have no idea if this will take hours or days.

There is a whole BOT Module that i haven’t even started. Luckily there is code already online from people who made some before and put it on gethub for free. So that should help start the module a lot.