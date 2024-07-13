/** @param {NS} ns */
export async function main(ns) {
    const hackFileName = 'hack-template.js';
    const hackSkill = 311;
    const neighbors = ns.scan();
    var processed = [];
    var toProcess = [];
    var results = [];
    var hackMostMoney = ns.args[0];
    var targetHackable = ns.args[1];
    var pServ = [];
  
  
    toProcess = toProcess.concat(neighbors);
    while (toProcess.length > 0) {
      const neighbor = toProcess.pop();
      if (!neighbor) {
        break;
      }
      const server = ns.getServer(neighbor);
      if (!server.hasAdminRights || server.hostname.startsWith('pserv') || processed.indexOf(neighbor) >= 0) {
        if(server.hostname.startsWith('pserv')) {
          pServ.push(server.hostname);
        }
        continue;
      }
      const _can = hackSkill >= server.requiredHackingSkill;
      const _time = _can ? millisToMinutesAndSeconds(ns.getHackTime(server.hostname)) : '--'; 
      const result = {
        hostName: server.hostname,
        moneyMax: server.moneyMax,
        moneyMaxFormatted: moneyFormat(server.moneyMax),
        requiredHackingSkill: server.requiredHackingSkill,
        canHack: _can,
        time: _time
      }
      results.push(result);
      let nNeighbors = ns.scan(server.hostname);
      for (var i = 0; i < nNeighbors.length; i++) {
        if (processed.indexOf(nNeighbors[i]) >= 0) {
          continue;
        }
        toProcess.push(nNeighbors[i]);
      }
      processed.push(server.hostname);
    }
  
    results = results.sort((a,b) => b.moneyMax - a.moneyMax);
    let hackIndex = 0;
    ns.tprintf('%6s | %20s | %20s | %5s | %9s', 'Idx', 'Host', 'Max $', 'Hack', 'Hackable?');
    for(var i = 0; i < results.length; i++) {
      const r = results[i];
      const idx = r.canHack ? hackIndex++ : '--';
      ns.tprintf('%(idx)6s | %(hostName)20s | %(moneyMaxFormatted)20s | %(requiredHackingSkill)5s | %(canHack)9s | %(time)5s', {idx, ...r});
    }
  
    if(!hackMostMoney) {
      return;
    }
    let serverToHack;
    let serverToHackCount = 0;
    let serverToHackTarget = targetHackable ? targetHackable : 0;
    for(var k = 0; k < results.length; k++) {
      if(results[k].canHack) {
        if(serverToHackCount++ === serverToHackTarget) {
          serverToHack = results[k].hostName;
          break;
        }
      }
    }
    const scriptMem = ns.getScriptRam(hackFileName);
    ns.tprintf('Hacking server %s', serverToHack);
    const scriptTargets = processed.concat(pServ);
    for(var i = 0; i < scriptTargets.length; i++) {
      var serverName = scriptTargets[i];
      ns.killall(serverName);
      ns.scp(hackFileName, serverName);
      const server = ns.getServer(serverName);
      if(server.maxRam < scriptMem) {
        ns.tprintf('Not running script on %s because max ram was %s', serverName, server.maxRam);
        continue;
      }
      const threads = Math.floor(server.maxRam / scriptMem);
      ns.exec(hackFileName, serverName, threads, serverToHack);
    }
  }
  
  function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }
  
  function moneyFormat(n) {
    return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }