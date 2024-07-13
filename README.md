Various scripts for Bitburner. Code's a mess, and many parts, including singularity, are a WIP.

Of note: 

```
./scripts/init.js
```

This will run

* `scripts/ipvgo/random.js` - Just the random IPVGo player in the docs
* `scripts/servers/buy-servers.js` - Again, the default server buyer from the docs
* `scripts/scheduler/scheduler.js` - A task scheduler with a preference for `home`. Also spawns `scripts/scheduler/task-daemon.js` which is responsible for checking the completion of tasks. High memory is required on `home`. This handles accepting a script/args and, depending on memory requirements, automatically assigns the task out to any available servers. If no servers are available, the task is queued and executed when server memory is available.
* `scripts/util/auto-root.js` - This will automatically root servers when possible until all servers are rooted.
* `scripts/test/sync-all.js` - Automatically syncs all scripts to rooted servers.
* `scripts/hack/deploy-hack-v2.js` - This handles hack/weaken/grow and sends these requests to the scheduler. It then periodically checks for task completions and recalculates hack/weaken/grow requirements. No optimizations have been done if formulas isn't unlocked.

The above requires a few upgrades to `home` memory. `/scripts/hack/deploy-hack.js` (not v2) has lower memory requirements (~7GB) and can be run until enough memory is available to run the scheduler.

Additional utils: 

* `/scripts/stocks/stock-trader.js` - A basic stock trader. Requires TIX Api, but can make a ton of money.
* `/scripts/util/backdoor-boy.js` - Automatically backdoor every possible server. No need for singularity API. Could target a specific sever with minor modifications.
* `/scripts/util/t-connect.js` - `run t-connect.js <target>` automatically connects to `target` without singularity API.
* `/scripts/util/describe.js` - Describe all servers with some sorting options (hack requirement, weaken time, etc.)
* `/scripts/servers/upgrade-servers.js` - Upgrades or prints upgrade requirements for player owned servers. Memory is referred to as `t1, t2, ..., t18`. So `./upgrade-servers.js t10 p` will print per server + total cost to upgrade to 4TB and `./upgrade-servers.js t10 b` will make the purchase.

Some known issues: 

The scheduler may try to execute hack/weaken/grow before newly hacked servers have had scripts synced. The scheduler will print errors to the logs, but it will eventually fix itself when files are sync'd by `sync-all.js`. Not high priority to fix.
