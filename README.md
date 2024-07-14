Various scripts for Bitburner. Code's a mess, and many parts, including singularity, are a WIP. Javascript is also not my daily language, so I may not follow usual style rules but I believe it's at least somewhat consistent.

---

Of note: 

```
./scripts/init.js
```

This will run

* `scripts/ipvgo/random.js` - Just the random IPVGo player in the docs
* `scripts/servers/buy-servers.js` - Again, the default server buyer from the docs
* `scripts/scheduler/scheduler.js` - A task scheduler with a preference for `home`. Also spawns `scripts/scheduler/task-daemon.js` which is responsible for checking the completion of tasks. High memory is required on `home`. This handles accepting a script/args/threads and, depending on memory requirements, automatically breaks the task down and distributes to any available servers, and ties it all back to a single unique ID. If no servers are available, the task is queued and executed when resources are available in a FIFO fashion. Due to memory/port feature limitations, this is NOT real time but it is fairly fast at notifying task completions. Batch scheduling is recommended if queuing many tasks, otherwise tasks will be lost due to limitations of the port feature in the game. See `schedule-server.js`
* `scripts/scheduler/task-daemon.js` - Responsible for monitoring task completion of tasks queued by the scheduler. Automatically started by the scheduler. Also monitors for orphaned tasks. (Orphan feature is not thoroughly tested and may mark currently executing tasks as orphaned)
* `scripts/util/auto-root.js` - This will automatically root servers when possible until all servers are rooted.
* `scripts/test/sync-all.js` - Automatically syncs all scripts on `home` to rooted servers.
* `scripts/hack/deploy-hack-v2.js` - This handles hack/weaken/grow and sends these requests to the scheduler. It then periodically checks for task completions and recalculates hack/weaken/grow requirements. No optimizations have been done if formulas isn't unlocked.

The above requires a few upgrades to `home` memory. `/scripts/hack/deploy-hack.js` (not v2) has lower memory requirements (~7GB) and can be run until enough memory is available to run the scheduler.

Additional utils: 

* `/scripts/scheduler/schedule-service.js` - Abstraction for interacting with the scheduler.
* `/scripts/stocks/stock-trader.js` - A basic stock trader. Requires TIX Api, but can make a ton of money. (~21GB)
* `/scripts/util/backdoor-boy.js` - Automatically backdoor every possible server. No need for singularity API. Could target a specific sever with minor modifications. This manipulates the DOM directly (cost of ~31GB) 
* `/scripts/util/t-connect.js` - `run t-connect.js <target>` automatically connects to `target` without singularity API. This manipulates the DOM directly (cost of ~31GB) 
* `/scripts/util/describe.js` - Describe all servers with some sorting options (hack requirement, weaken time, etc.) (~4.2GB)
* `/scripts/servers/upgrade-servers.js` - Upgrades or prints upgrade requirements for player owned servers. Memory is referred to as `t1, t2, ..., t18`. So `./upgrade-servers.js t10 p` will print per server + total cost to upgrade to 4TB and `./upgrade-servers.js t10 b` will make the purchase. See source for real values of `t[n]`. (~4.3GB)
* `/scripts/hack/grind-levels.js` - Requires running scheduler. Queues 10,000,000 weaken threads on a target server. Example usage `grind-levels.js foodnstuff`. Recommend using in combination with `describe.js WEAKEN_TIME` to find a server with a good combination of low weaken time and weaken level.  Can be used in combination with `deploy-hack-v2.js` without too much affect on hacking money generated assuming servers are upgraded sufficiently and weaken time is low. (~1.7GB + scheduler and task daemon cost).

Some known issues: 

The scheduler may try to execute hack/weaken/grow before newly hacked servers have had scripts synced. The scheduler will print errors to the logs, but it will eventually fix itself when files are sync'd by `sync-all.js`. Not high priority to fix.

The task daemon may mark a job as incorrectly orphaned if it runs for too long. 

Ports don't seem to always be properly cleared when installing augmentations. The task-scheduler SHOULD handle this okay and just mark the tasks from before augmentation installation, but
