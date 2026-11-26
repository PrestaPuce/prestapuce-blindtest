/* ============================================================================
 * mj-actions.js — Actions de Jeu, Arbitrage Points, Modération, Paramètres & Mode Jour
 * Console MJ Pro - Buz'Ta Puce (v1.304)
 * ============================================================================ */

function openEditModal(uid) { const d = allPlayersData[uid]; if(!d)return; editingPlayerUid=uid; editingPlayerOriginalPseudo=d.name; editingPlayerOriginalAvatar=d.avatar||"👤"; editingPlayerCurrentAvatar=editingPlayerOriginalAvatar; document.getElementById('edit-player-name').value=d.name; document.getElementById('btn-censor-avatar').style.display=(editingPlayerOriginalAvatar.length>20)?'block':'none'; updateEditAvatarPreview(); populateEditGallery(); document.getElementById('modal-edit-player').style.display='flex'; }
function populateEditGallery() { const g=document.getElementById('edit-avatar-gallery'); g.innerHTML=""; const o=document.createElement('div'); o.className='edit-gallery-item original-avatar-item'; if(editingPlayerOriginalAvatar.length>20)o.innerHTML=`<img src="${editingPlayerOriginalAvatar}">`; else o.innerText=editingPlayerOriginalAvatar; o.onclick=()=>{editingPlayerCurrentAvatar=editingPlayerOriginalAvatar;updateEditAvatarPreview();}; g.appendChild(o); avatars.forEach(a=>{ const d=document.createElement('div'); d.className='edit-gallery-item'; d.innerText=a; d.onclick=()=>{editingPlayerCurrentAvatar=a;updateEditAvatarPreview();}; g.appendChild(d); }); }
function updateEditAvatarPreview() { const c=document.getElementById('edit-player-avatar-preview'); if(editingPlayerCurrentAvatar.length>20)c.innerHTML=`<img src="${editingPlayerCurrentAvatar}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`; else c.innerText=editingPlayerCurrentAvatar; }
function censorPlayerAvatar() { editingPlayerCurrentAvatar = mjProfileData.customLogo || APP_CONFIG.LOGO_URL; updateEditAvatarPreview(); }
function closeEditPlayerModal() { document.getElementById('modal-edit-player').style.display='none'; editingPlayerUid=null; }

function savePlayerEdit() { 
    if(!editingPlayerUid)return; 
    const v=document.getElementById('edit-player-name').value.trim(); 
    if(!/^[a-zA-Z0-9À-ÿ\s\-_]+$/.test(v)||v.length<2)return alert("Pseudo invalide (Lettres, chiffres, 2 car. min)."); 
    let tk=false; 
    Object.keys(allPlayersData).forEach(u=>{if(u!==editingPlayerUid&&allPlayersData[u].name&&allPlayersData[u].name.toLowerCase()===v.toLowerCase())tk=true;}); 
    if(tk)return alert("Déjà utilisé."); 

    if (window.isSandboxMode) {
        if (allPlayersData[editingPlayerUid]) {
            if (v !== editingPlayerOriginalPseudo && currentBlocked[editingPlayerOriginalPseudo]) {
                delete currentBlocked[editingPlayerOriginalPseudo];
                currentBlocked[v] = true;
            }
            allPlayersData[editingPlayerUid].name = v;
            allPlayersData[editingPlayerUid].avatar = editingPlayerCurrentAvatar;
            if (currentBuzzerId === editingPlayerUid && currentPlayer) {
                currentPlayer.name = v;
                currentPlayer.pseudo = v;
                currentPlayer.avatar = editingPlayerCurrentAvatar;
                document.getElementById('p-name').innerText = v;
                document.getElementById('p-avatar').innerHTML = (editingPlayerCurrentAvatar.length > 20)
                    ? `<img src="${editingPlayerCurrentAvatar}" style="width:70px; height:70px; border-radius:50%; object-fit:cover;">`
                    : editingPlayerCurrentAvatar;
            }
        }
        closeEditPlayerModal();
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    
    logEvent('SYSTEM', `MJ a édité le profil du joueur : ${v}`);
    
    roomRef.child('players/'+editingPlayerUid).update({name:v, avatar:editingPlayerCurrentAvatar}).then(()=>{ 
        if(v!==editingPlayerOriginalPseudo&&currentBlocked[editingPlayerOriginalPseudo]){
            roomRef.child('blockedPlayers/'+editingPlayerOriginalPseudo).remove();
            roomRef.child('blockedPlayers/'+v).set(true);
        } 
        if(currentBuzzerId===editingPlayerUid) roomRef.child('buzzers').update({pseudo:v, avatar:editingPlayerCurrentAvatar}); 
        closeEditPlayerModal(); 
    }); 
}

function setPlayerScore(u, v) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) allPlayersData[u].pts = parseInt(v) || 0;
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    logEvent('SCORE', `MJ a fixé manuellement le score à ${v}`);
    roomRef.child('players/'+u).update({pts: parseInt(v)||0}); 
}

function warnPlayer(u, n) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) allPlayersData[u].hasBeenWarned = true;
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    window.mjConfirm("🟨 Carton Jaune", `Envoyer un avertissement officiel à ${n} ?`, () => {
        logEvent('PUNISH', `MJ a donné un AVERTISSEMENT au joueur : ${n}`);
        roomRef.child('players/'+u).update({hasBeenWarned:true, pendingWarning:true}); 
    }, "🟨 Avertir", "var(--gold)");
}

function acceptRecovery(u) { 
    if (window.isSandboxMode) return;
    logEvent('SYSTEM', `MJ a autorisé une demande de reconnexion`);
    roomRef.child('players/'+u).update({recoveryRequest:'validated'}); 
}

function rejectRecovery(u) { 
    if (window.isSandboxMode) return;
    window.mjConfirm("✖ Refuser la reconnexion", "Refuser cette demande de récupération de profil ?", () => {
        logEvent('PUNISH', `MJ a refusé une demande de reconnexion`);
        roomRef.child('players/'+u).update({recoveryRequest:null}); 
    });
}

function archiveTeam(n) { 
    if (window.isSandboxMode) {
        if (globalTeams[n]) globalTeams[n].active = false;
        renderLobby(); renderTeamLobby();
        return;
    }
    window.mjConfirm("⏸️ Pause d'équipe", `Mettre l'équipe ${n} en pause (scores gelés) ?`, () => { 
        logEvent('SYSTEM', `MJ a mis en PAUSE l'équipe ${n}`);
        let c=0; Object.values(allPlayersData).forEach(p=>{if(p.teamName===n)c+=(p.pts||0);}); c+=(globalTeams[n].bonus||0); let m=[]; Object.entries(allPlayersData).forEach(([u,p])=>{if(p.teamName===n)m.push(u);}); roomRef.child('teams/'+n).update({active:false, frozenScore:c, previousMembers:m, lastState:'active'}); m.forEach(u=>roomRef.child('players/'+u).update({teamName:"Solo", teamIcon:""})); 
    }, "⏸️ Mettre en pause", "var(--blue)"); 
}

function banTeam(n) { 
    if (window.isSandboxMode) {
        if (globalTeams[n]) { globalTeams[n].active = false; globalTeams[n].banned = true; }
        renderLobby(); renderTeamLobby();
        return;
    }
    window.mjConfirm("🟥 Bannir l'équipe", `Expulser l'équipe ${n} de la partie ?`, () => { 
        logEvent('PUNISH', `MJ a BANNI l'équipe ${n}`);
        let m=[]; Object.entries(allPlayersData).forEach(([u,p])=>{if(p.teamName===n)m.push(u);}); roomRef.child('teams/'+n).update({active:false, banned:true, previousMembers:m, lastState:(globalTeams[n].active!==false?'active':'inactive')}); m.forEach(u=>roomRef.child('players/'+u).update({teamName:"Solo", teamIcon:"", active:true, banned:false})); 
    }); 
}

function openRestoreModal(n) {
    const t=globalTeams[n];
    if (!t) return;
    if (window.isSandboxMode) {
        t.active = true; t.banned = false;
        renderLobby(); renderTeamLobby();
        return;
    }
    if(t.lastState==='active'||(!t.banned&&!t.active)){
        window.mjConfirm("▶️ Réactiver l'équipe", `Réactiver l'équipe ${n} ?`, () => performRestore(n,'active'), "🟢 Réactiver", "var(--mj-color)");
    } else {
        pendingRestoreTeam=n;
        document.getElementById('restore-team-msg').innerText=`${n} était EN PAUSE avant d'être bannie.`;
        document.getElementById('modal-restore-team').style.display='flex';
    }
}
function confirmRestoreAction(m) { if(pendingRestoreTeam){performRestore(pendingRestoreTeam,m); closeRestoreModal();} }
function closeRestoreModal() { document.getElementById('modal-restore-team').style.display='none'; pendingRestoreTeam=null; }
function performRestore(n, s) { 
    if (window.isSandboxMode) {
        if (globalTeams[n]) { globalTeams[n].active = (s === 'active'); globalTeams[n].banned = false; }
        renderLobby(); renderTeamLobby();
        return;
    }
    logEvent('SYSTEM', `MJ a RESTAURÉ l'équipe ${n} (Mode: ${s})`);
    if(s==='active') roomRef.child('teams/'+n).update({active:true, banned:false, frozenScore:null, previousMembers:null}); 
    else if(s==='inactive') roomRef.child('teams/'+n).update({active:false, banned:false}); 
}

function deleteTeamDefinitive(n) { 
    if (window.isSandboxMode) {
        delete globalTeams[n];
        Object.values(allPlayersData).forEach(p => { if (p.teamName === n) { p.teamName = "Solo"; p.isCaptain = false; } });
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    window.mjConfirm("🗑️ Supprimer l'équipe", `Supprimer DÉFINITIVEMENT l'équipe ${n} ?`, () => {
        logEvent('SYSTEM', `MJ a supprimé l'équipe : ${n}`);
        roomRef.child('teams/'+n).remove(); 
    });
}

function updateTeamBonus(n, d) { 
    if (window.isSandboxMode) {
        if (globalTeams[n]) globalTeams[n].bonus = (globalTeams[n].bonus || 0) + d;
        renderTeamLobby();
        return;
    }
    const t=globalTeams[n]; 
    logEvent('SCORE', `Ajustement bonus MJ : ${d>0?'+':''}${d} pts pour l'équipe ${n}`);
    if(t.active!==false)roomRef.child('teams/'+n+'/bonus').transaction(v=>(v||0)+d); 
    else roomRef.child('teams/'+n).update({frozenScore:(t.frozenScore||0)+d, bonus:(t.bonus||0)+d}); 
}

function forceBuzzer(u) { 
    const p=allPlayersData[u]; 
    if(!p) return;
    if (window.isSandboxMode) {
        activateSandboxPlayerForStep5(u);
        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 6) {
            const pBox = document.getElementById('player-box');
            if (pBox) pBox.classList.add('tuto-highlight');
            const simuDock = document.getElementById('simu-phones-container');
            if (simuDock) simuDock.classList.add('tuto-peek');
            const pZone = document.getElementById('tuto-zone-players');
            if (pZone && typeof scrollAndPositionTooltip === 'function') scrollAndPositionTooltip(pZone);
        }
        return;
    }
    logEvent('SYSTEM', `MJ a FORCÉ LE BUZZER pour ${p.name}`);
    roomRef.child('gameState').update({status:'taken'}); 
    roomRef.child('buzzers').set({id:u, pseudo:p.name, avatar:p.avatar||"", teamName:p.teamName||"Solo", teamIcon:p.teamIcon||""}); 
}

function toggleBlockPlayer(ps) { 
    if (window.isSandboxMode) {
        if (currentBlocked[ps]) delete currentBlocked[ps];
        else currentBlocked[ps] = true;
        updateSimuPhones(); renderLobby();
        return;
    }
    if(currentBlocked[ps]) {
        logEvent('SYSTEM', `MJ a débloqué le buzzer de ${ps}`);
        roomRef.child('blockedPlayers/'+ps).remove(); 
    } else { 
        logEvent('PUNISH', `MJ a bloqué le buzzer de ${ps}`);
        roomRef.child('blockedPlayers/'+ps).set(true); 
    }
}

function triggerEndGame() { 
    if (window.isSandboxMode) {
        window.mjConfirm(
            "🏁 Fin du Bac à Sable",
            "Bravo ! En conditions réelles, le Podium Olympique et une pluie de confettis s'affichent sur votre Écran Géant et sur les téléphones des vainqueurs.\n\n💡 Bon à savoir : Si vous souhaitez refaire un essai ultérieurement, cliquez simplement sur le bouton « 🎓 Bac à Sable » situé sur le côté en haut à droite !",
            () => {
                window.endTuto(true, false);
            },
            "🎉 Terminer la démo",
            "var(--success)"
        );
        return;
    }
    window.mjConfirm("🏁 Fin de Partie", "Clôturer la partie maintenant ?\n\nCela affichera le Podium Final sur l'Écran Géant et archivera cette salle en Lecture Seule.", () => { 
        logEvent('SYSTEM', "🏁 MJ a déclenché la FIN DE PARTIE");
        roomRef.child('gameState').set({status:'endGame', timestamp:Date.now()}); 
        roomRef.update({ isArchived: true });
        roomRef.child('buzzers').remove(); 
        roomRef.child('buzzAttempts').remove(); 
        
        const publicRef = db.ref('activeRooms/' + roomID);
        publicRef.remove();
        publicRef.onDisconnect().cancel();

        document.getElementById('screen-dashboard').classList.add('readonly-mode');
        document.getElementById('readonly-banner').style.display = 'block';
    }, "🏁 Afficher le Podium", "var(--gold)"); 
}

function statusUpdate(st) { 
    if (window.isSandboxMode) {
        currentGameState = st;
        if (st === 'ready' || st === 'waiting') {
            currentBuzzerId = null;
            currentPlayer = null;
            document.getElementById('player-box').style.display = 'none';
        }
        const btnOpenBuzz = document.getElementById('btn-open-buzz');
        if (btnOpenBuzz) {
            if (st === 'ready' || st === 'taken') {
                btnOpenBuzz.disabled = true;
                btnOpenBuzz.innerHTML = "🟢 BUZZERS OUVERTS";
            } else {
                btnOpenBuzz.disabled = false;
                btnOpenBuzz.innerHTML = "Ouvrir Buzzers";
            }
        }
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    if(roomRef) { 
        roomRef.child('gameState').set({status:st}); 
        if(st==='ready') { 
            logEvent('SYSTEM', "Ouverture des buzzers");
            roomRef.child('buzzers').remove(); 
            roomRef.child('buzzAttempts').remove(); 
            buzzProcessing = false;
        } 
    } 
}

function openNextQuestion() {
    if (window.isSandboxMode) {
        currentBlocked = {};
        currentBuzzerId = null;
        currentPlayer = null;
        currentGameState = 'ready';
        document.getElementById('player-box').style.display = 'none';
        const btnOpenBuzz = document.getElementById('btn-open-buzz');
        if (btnOpenBuzz) {
            btnOpenBuzz.disabled = true;
            btnOpenBuzz.innerHTML = "🟢 BUZZERS OUVERTS";
        }
        updateSimuPhones();
        renderLobby();
        renderTeamLobby();
        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 2) {
            window.nextTutoStep();
        }
        return;
    }
    if (!roomRef) return;
    roomRef.child('buzzers').remove();
    roomRef.child('buzzAttempts').remove();
    roomRef.child('blockedPlayers').remove();
    roomRef.child('gameState').set({status: 'ready'});
    currentPlayer = null;
    document.getElementById('player-box').style.display = 'none';
}

function fullReset() {
    if (window.isSandboxMode) {
        currentBlocked = {};
        statusUpdate('waiting');
        return;
    }
    if (!roomRef) return;
    logEvent('SYSTEM', "Reset global (Nettoyage des buzzers et blocages)");
    roomRef.child('blockedPlayers').remove(); 
    roomRef.child('buzzers').remove(); 
    roomRef.child('buzzAttempts').remove(); 
    statusUpdate('waiting'); 
}

function adj(u, v) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) allPlayersData[u].pts = (allPlayersData[u].pts || 0) + v;
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    logEvent('SCORE', `MJ a ajusté le score d'un joueur (${v > 0 ? '+' : ''}${v})`);
    roomRef.child('players/'+u+'/pts').transaction(x=>(x||0)+v); 
}

function kickPlayer(u, n) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) { allPlayersData[u].banned = true; allPlayersData[u].active = false; }
        if (currentBuzzerId === u) statusUpdate('ready');
        else { updateSimuPhones(); renderLobby(); renderTeamLobby(); }
        return;
    }
    window.mjConfirm("🟥 Carton Rouge", `Expulser ${n} de la partie ?`, () => {
        logEvent('PUNISH', `MJ a banni le joueur : ${n}`);
        roomRef.child('players/'+u).update({banned:true, active:false}); 
        if (currentBuzzerId === u) { 
            roomRef.child('buzzers').remove();
            if (currentGameState === 'taken') { statusUpdate('ready'); }
        }
    });
}

function unkickPlayer(u) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) { allPlayersData[u].banned = false; allPlayersData[u].active = true; }
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    logEvent('SYSTEM', `MJ a levé le bannissement d'un joueur`);
    roomRef.child('players/'+u).update({banned:false, active:true, reconnectedAt:Date.now(), kickedByMj: null}); 
}

function restoreInactivePlayer(u) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) allPlayersData[u].active = true;
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    logEvent('SYSTEM', `MJ a forcé la réactivation d'un joueur inactif`);
    roomRef.child('players/'+u).update({active:true, reconnectedAt:Date.now(), kickedByMj: null}); 
}

function togglePlayerTeam(u, c) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) {
            allPlayersData[u].teamName = c;
            if (c === "Solo") allPlayersData[u].isCaptain = false;
            else {
                const hasCap = Object.keys(allPlayersData).some(k => k !== u && allPlayersData[k].teamName === c && allPlayersData[k].isCaptain && !allPlayersData[k].banned);
                if (!hasCap) allPlayersData[u].isCaptain = true;
            }
        }
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    const i=(c==="Solo")?"":(globalTeams[c]?globalTeams[c].icon:""); 
    const pName = allPlayersData[u] ? allPlayersData[u].name : "Un joueur";
    
    let teamHasCaptain = false;
    if (c !== "Solo") {
        for (let pId in allPlayersData) {
            if (allPlayersData[pId].teamName === c && !allPlayersData[pId].banned && pId !== u) {
                if (allPlayersData[pId].isCaptain) teamHasCaptain = true;
            }
        }
    }
    
    const isCaptainNow = (c !== "Solo" && !teamHasCaptain);

    logEvent('SYSTEM', `MJ a déplacé ${pName} vers : ${c} ${isCaptainNow ? '(Couronné)' : ''}`);
    
    roomRef.child('players/'+u).update({
        teamName:c, 
        teamIcon:i, 
        isCaptain: isCaptainNow,
        captainMessage: isCaptainNow ? `👑 Vous avez été nommé capitaine de l'équipe ${c} !` : null
    }); 
}

function handleError() { 
    if (window.isSandboxMode) {
        if (!currentPlayer) return;
        const uid = currentPlayer.id;
        const pObj = (uid && allPlayersData[uid]) ? allPlayersData[uid] : currentPlayer;
        const pName = pObj.name || currentPlayer.name || currentPlayer.pseudo;
        const pTeam = pObj.teamName || currentPlayer.teamName || 'Solo';
        const tLock = (window.roomSettings && window.roomSettings.teamLock === 'team') && pTeam && pTeam !== 'Solo';

        if (tLock) {
            Object.values(allPlayersData).forEach(p => {
                if (p && p.teamName === pTeam && !p.banned && p.name) {
                    currentBlocked[p.name] = true;
                }
            });
            if (pName) currentBlocked[pName] = true;
        } else if (pName) {
            currentBlocked[pName] = true;
        }

        const pBox = document.getElementById('player-box');
        if (pBox) { pBox.classList.remove('tuto-highlight'); pBox.style.marginTop = ''; }
        statusUpdate('ready');

        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4 && typeof window.onTutoStep5Arbitrated === 'function') {
            window.onTutoStep5Arbitrated('error', 0, pName, pTeam, tLock);
        }
        return;
    }

    if (currentPlayer && (currentPlayer.name || currentPlayer.id)) {
        const uid = currentPlayer.id;
        const pObj = (uid && allPlayersData[uid]) ? allPlayersData[uid] : currentPlayer;
        const pName = pObj.name || currentPlayer.name || currentPlayer.pseudo;
        const pTeam = pObj.teamName || currentPlayer.teamName || "Solo";

        roomRef.child('settings/teamLock').once('value').then(snap => {
            const isTeamLock = (snap.val() === 'team') && pTeam && pTeam !== "Solo";
            let updates = {
                'buzzers': null,
                'buzzAttempts': null,
                'gameState': { status: 'ready' }
            };

            if (isTeamLock) {
                logEvent('PUNISH', `Erreur : L'équipe entière ${pTeam} est bloquée`);
                Object.values(allPlayersData).forEach(p => {
                    if (p && p.teamName === pTeam && !p.banned && p.name) {
                        updates['blockedPlayers/' + p.name] = true;
                    }
                });
                if (pName) updates['blockedPlayers/' + pName] = true;
            } else {
                logEvent('PUNISH', `Erreur : ${pName} bloqué(e) en individuel`);
                if (pName) updates['blockedPlayers/' + pName] = true;
            }

            buzzProcessing = false;
            roomRef.update(updates);
        });
    }
}

function handleReward(pts, m) {
    if (window.isSandboxMode) {
        if (!currentPlayer || !currentPlayer.id) return;
        const uid = currentPlayer.id;
        const pObj = allPlayersData[uid] || currentPlayer;
        const pName = pObj.name || currentPlayer.name || currentPlayer.pseudo;
        const pTeam = pObj.teamName || currentPlayer.teamName || 'Solo';
        const tLock = (window.roomSettings && window.roomSettings.teamLock === 'team') && pTeam && pTeam !== 'Solo';

        if (allPlayersData[uid]) allPlayersData[uid].pts = (allPlayersData[uid].pts || 0) + pts;
        const pBox = document.getElementById('player-box');
        if (pBox) { pBox.classList.remove('tuto-highlight'); pBox.style.marginTop = ''; }

        if (m === 'finish') {
            statusUpdate('waiting');
        } else {
            if (tLock) {
                Object.values(allPlayersData).forEach(p => {
                    if (p && p.teamName === pTeam && !p.banned && p.name) {
                        currentBlocked[p.name] = true;
                    }
                });
                if (pName) currentBlocked[pName] = true;
            } else if (pName) {
                currentBlocked[pName] = true;
            }
            statusUpdate('ready');
        }

        if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4 && typeof window.onTutoStep5Arbitrated === 'function') {
            window.onTutoStep5Arbitrated(m, pts, pName, pTeam, tLock);
        }
        return;
    }

    if (!currentPlayer || !currentPlayer.id) return;

    const uid = currentPlayer.id;
    const pObj = allPlayersData[uid] || currentPlayer;
    const pName = pObj.name || currentPlayer.name || currentPlayer.pseudo;
    const pTeam = pObj.teamName || currentPlayer.teamName || "Solo";

    if (!uid.startsWith('u_')) {
        db.ref('users_crm/' + uid).once('value').then(snap => {
            if (snap.exists()) {
                db.ref('users_crm/' + uid + '/stats/totalPoints').transaction(curr => (curr || 0) + pts);
            }
        });
    }

    roomRef.child('players/' + uid).once('value').then(snap => {
        if (snap.exists()) {
            const p = snap.val();
            const newPts = (p.pts || 0) + pts;
            roomRef.child('players/' + uid).update({ pts: newPts });
            logEvent('SCORE', `➕ ${p.name} gagne ${pts} pts (Total: ${newPts})`);
        }
    });

    if (m === 'finish') {
        roomRef.child('gameState').set({ status: 'waiting' });
    } else {
        roomRef.child('settings/teamLock').once('value').then(snap => {
            const isTeamLock = (snap.val() === 'team') && pTeam && pTeam !== "Solo";
            let updates = {
                'buzzers': null,
                'buzzAttempts': null,
                'gameState': { status: 'ready' }
            };

            if (isTeamLock) {
                logEvent('SYSTEM', `+${pts} (On continue) : L'équipe entière ${pTeam} est bloquée pour la suite du titre`);
                Object.values(allPlayersData).forEach(p => {
                    if (p && p.teamName === pTeam && !p.banned && p.name) {
                        updates['blockedPlayers/' + p.name] = true;
                    }
                });
                if (pName) updates['blockedPlayers/' + pName] = true;
            } else {
                logEvent('SYSTEM', `+${pts} (On continue) : ${pName} bloqué(e) en individuel pour la suite du titre`);
                if (pName) updates['blockedPlayers/' + pName] = true;
            }

            buzzProcessing = false;
            roomRef.update(updates);
        });
    }
}

function executeQuitRoom() {
    if(mjProfileData.isGuest===true) {
        if(confirm("⚠️ SUPPRESSION DÉFINITIVE DE CETTE SALLE ?\nToutes les données (scores, équipes) seront perdues.")) {
            roomRef.child('gameState').set({status:'closing', timestamp:Date.now()});
            setTimeout(() => {
                roomRef.remove(); 
                db.ref('activeRooms/'+roomID).remove(); 
                checkUserRoom(auth.currentUser.uid);
            }, 5000);
        }
    } else { 
        if(roomRef) roomRef.child('buzzers').off(); 
        if(!document.getElementById('screen-dashboard').classList.contains('readonly-mode') && roomID) {
            const publicRef = db.ref('activeRooms/' + roomID);
            publicRef.remove();
            publicRef.onDisconnect().cancel();
        }
        checkUserRoom(auth.currentUser.uid); 
    }
}

function quitRoom() { 
    if (window.isSandboxMode) {
        window.mjConfirm(
            "🎓 Fin du Bac à Sable",
            "Vous allez quitter le mode Bac à Sable et revenir à l'accueil de vos salles.\n\n💡 Bon à savoir : Vous retrouverez à tout moment le bouton « 🎓 Bac à Sable » dans le menu sur le côté en haut à droite d'une salle si vous souhaitez relancer l'entraînement ultérieurement !",
            () => {
                window.endTuto(true, true);
                executeQuitRoom();
            },
            "🚪 Quitter la partie",
            "var(--blue)"
        );
        return;
    }
    executeQuitRoom();
}

function startDeleteHold(e) {
    if(e) e.preventDefault();
    if (window.isSandboxMode) {
        alert("ℹ️ La suppression de salle est désactivée pendant le Bac à Sable pour protéger votre vraie salle.");
        return;
    }
    const btn = document.getElementById('btn-delete-room');
    if(btn.disabled) return;
    
    btn.classList.add('holding');
    btn.innerHTML = "<div>⏳ MAINTENEZ...</div><small style=\"font-size:0.7rem; opacity:0.8; font-weight:normal;\">(Détruire)</small>";
    
    holdTimer = setTimeout(() => {
        btn.classList.remove('holding');
        btn.innerHTML = "<div>💥 SUPPRESSION...</div><small style=\"font-size:0.7rem; opacity:0.8; font-weight:normal;\">(Détruire)</small>";
        btn.disabled = true;
        
        roomRef.child('gameState').set({status:'closing', timestamp:Date.now()});
        
        backupAndDestroyRoom(roomID).then(() => {
            checkUserRoom(auth.currentUser.uid);
        });
    }, 5000);
}

function cancelDeleteHold(e) {
    if(e) e.preventDefault();
    clearTimeout(holdTimer);
    const btn = document.getElementById('btn-delete-room');
    if(btn && !btn.disabled) {
        btn.classList.remove('holding');
        btn.innerHTML = "<div>⚠️ Supprimer</div><small style=\"font-size:0.7rem; opacity:0.8; font-weight:normal;\">(Détruire)</small>";
    }
}

// --- PATCH V1.300 : MODÉRATION NON-BLOQUANTE (PROTÈGE LE PLEIN ÉCRAN TV) ---
function pausePlayer(u, n) { 
    if (window.isSandboxMode) {
        if (allPlayersData[u]) allPlayersData[u].active = false;
        if (currentBuzzerId === u) statusUpdate('ready');
        else { updateSimuPhones(); renderLobby(); renderTeamLobby(); }
        return;
    }
    window.mjConfirm("⏸️ Mettre en pause", `Mettre le joueur ${n} en pause ?`, () => {
        logEvent('SYSTEM', `MJ a mis le joueur ${n} en PAUSE`);
        roomRef.child('players/'+u).update({active: false, kickedByMj: true}); 
        if (currentBuzzerId === u) { 
            roomRef.child('buzzers').remove();
            if (currentGameState === 'taken') { statusUpdate('ready'); }
        }
    }, "⏸️ Mettre en pause", "var(--blue)");
}

function deletePlayerDefinitive(u, n) { 
    if (window.isSandboxMode) {
        delete allPlayersData[u];
        buildSimuPhones();
        if (currentBuzzerId === u) statusUpdate('ready');
        else { updateSimuPhones(); renderLobby(); renderTeamLobby(); }
        return;
    }
    window.mjConfirm("🗑️ Supprimer le joueur", `Supprimer définitivement le joueur ${n} de cette salle ?`, () => {
        logEvent('SYSTEM', `MJ a supprimé définitivement le joueur : ${n}`);
        roomRef.child('players/'+u).remove(); 
        if (currentBuzzerId === u) { 
            roomRef.child('buzzers').remove();
            if (currentGameState === 'taken') { statusUpdate('ready'); }
        }
    }, "🗑️ Supprimer", "var(--danger)");
}

function warnTeam(n) { 
    if (window.isSandboxMode) {
        if (globalTeams[n]) globalTeams[n].hasBeenWarned = true;
        Object.values(allPlayersData).forEach(p => { if (p.teamName === n) p.hasBeenWarned = true; });
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }
    window.mjConfirm("🟨 Avertir l'équipe", `Envoyer un avertissement (Carton Jaune) à toute l'équipe ${n} ?`, () => {
        logEvent('PUNISH', `MJ a donné un AVERTISSEMENT à l'équipe : ${n}`);
        roomRef.child('teams/'+n).update({hasBeenWarned:true});
        Object.entries(allPlayersData).forEach(([uid, p]) => {
            if (p.teamName === n && p.active !== false && !p.banned) {
                roomRef.child('players/' + uid).update({ hasBeenWarned: true, pendingWarning: true });
                roomRef.child('blockedPlayers/' + p.name).set(true); 
            }
        });
        statusUpdate('ready');
    }, "🟨 Avertir l'équipe", "var(--gold)"); 
}

function toggleTeamBlock(n) {
    let members = [];
    Object.values(allPlayersData).forEach(p => {
        if (p.teamName === n && p.active !== false && !p.banned) members.push(p);
    });
    const isMuted = members.some(m => currentBlocked[m.name]);
    if (window.isSandboxMode) {
        if (isMuted) members.forEach(m => delete currentBlocked[m.name]);
        else members.forEach(m => currentBlocked[m.name] = true);
        updateSimuPhones(); renderLobby();
        return;
    }
    if (isMuted) { 
        logEvent('SYSTEM', `MJ a DÉBLOQUÉ les buzzers de l'équipe ${n}`);
        members.forEach(m => roomRef.child('blockedPlayers/' + m.name).remove()); 
    } 
    else { 
        logEvent('PUNISH', `MJ a BLOQUÉ les buzzers de l'équipe ${n}`);
        let updates = {}; 
        members.forEach(m => updates[m.name] = true); 
        roomRef.child('blockedPlayers').update(updates); 
    }
}

function kickTeam(n) { banTeam(n); }

function openRoomSettings() {
    if (window.isSandboxMode) {
        const settings = window.roomSettings || { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual' };
        document.getElementById('edit-room-login').value = settings.loginMode || 'full';
        document.getElementById('edit-room-mode').value = settings.gameMode || 'mixed';
        const lockSelect = document.getElementById('edit-room-team-lock');
        if (lockSelect) lockSelect.value = settings.teamLock || 'individual';
        toggleTeamLockUI('edit');
        document.getElementById('modal-room-settings').style.display = 'flex';
        return;
    }
    if(!roomRef) return;
    roomRef.child('settings').once('value').then(snap => {
        const settings = snap.val() || { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual' };
        document.getElementById('edit-room-login').value = settings.loginMode || 'full';
        document.getElementById('edit-room-mode').value = settings.gameMode || 'mixed';
        
        const lockSelect = document.getElementById('edit-room-team-lock');
        if (lockSelect) lockSelect.value = settings.teamLock || 'individual';
        
        toggleTeamLockUI('edit');
        
        document.getElementById('modal-room-settings').style.display = 'flex';
    });
}

function saveRoomSettings() {
    const newSettings = {
        loginMode: document.getElementById('edit-room-login').value,
        gameMode: document.getElementById('edit-room-mode').value,
        teamLock: document.getElementById('edit-room-team-lock') ? document.getElementById('edit-room-team-lock').value : 'individual'
    };

    if (window.isSandboxMode) {
        window.roomSettings = newSettings;
        refreshSandboxRulesBadges();
        if (newSettings.gameMode === 'solo_only') {
            Object.values(allPlayersData).forEach(p => { p.teamName = "Solo"; p.isCaptain = false; });
        }
        document.getElementById('modal-room-settings').style.display = 'none';
        updateSimuPhones(); renderLobby(); renderTeamLobby();
        return;
    }

    if(!roomRef) return;
    logEvent('SYSTEM', `⚙️ MJ a modifié les règles du jeu`);
    
    if (newSettings.gameMode === 'solo_only') {
        roomRef.child('players').once('value', snap => {
            let updates = {};
            snap.forEach(child => {
                const p = child.val();
                if (p.teamName && p.teamName !== "Solo") {
                    updates[child.key + '/teamName'] = "Solo";
                    updates[child.key + '/teamIcon'] = "";
                    updates[child.key + '/isCaptain'] = false;
                    updates[child.key + '/captainMessage'] = null;
                }
            });
            if(Object.keys(updates).length > 0) {
                roomRef.child('players').update(updates);
                logEvent('SYSTEM', `⚔️ Dissolution automatique de toutes les équipes (Mode 100% Solo)`);
            }
        });
    }
    
    roomRef.child('settings').update(newSettings).then(() => {
        document.getElementById('modal-room-settings').style.display = 'none';
    });
}

// 🚀 PATCH V1.300 : DÉCLENCHEUR MODE JOUR (RÉEL + SIMULATION ÉCRANS BLANCS)
function toggleDayMode() {
    if (window.isSandboxMode) {
        const nowDay = !document.body.classList.contains('day-mode');
        const btn = document.getElementById('btn-day-mode');
        if (nowDay) {
            document.body.classList.add('day-mode');
            if (btn) btn.innerHTML = "🌙 MODE NUIT";
        } else {
            document.body.classList.remove('day-mode');
            if (btn) btn.innerHTML = "☀️ MODE JOUR";
            if (mjProfileData.consoleBackground) applyMjConsoleBg(mjProfileData.consoleBackground);
        }
        updateSimuPhones();
        return;
    }
    if(!roomRef) return;
    roomRef.child('settings/dayMode').once('value').then(snap => {
        const isDay = snap.val() === true;
        roomRef.child('settings/dayMode').set(!isDay);
        logEvent('SYSTEM', `MJ a activé le Mode ${!isDay ? 'JOUR ☀️' : 'NUIT 🌙'}`);
    });
}

function toggleTeamLockUI(prefix) {
    const modeSelect = document.getElementById(prefix + '-room-mode');
    const container = document.getElementById(prefix + '-team-lock-container');
    if (modeSelect && container) {
        if (modeSelect.value === 'solo_only') {
            container.style.display = 'none';
        } else {
            container.style.display = 'block';
        }
    }
}
