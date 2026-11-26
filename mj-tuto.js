/* ============================================================================
 * mj-tuto.js — Simulateur Bac à Sable (5 Téléphones) & Tutoriel Guidé Interactif
 * Console MJ Pro - Buz'Ta Puce (v1.302)
 * ============================================================================ */

window.showTutoPrompt = function() {
    if (localStorage.getItem('mj_tuto_hide') === 'true') return;
    document.getElementById('modal-tuto-prompt').style.display = 'flex';
};

window.acceptTutoPrompt = function() {
    if (document.getElementById('tuto-dont-show-again').checked) localStorage.setItem('mj_tuto_hide', 'true');
    document.getElementById('modal-tuto-prompt').style.display = 'none';
    window.startTuto(0, true);
};

window.declineTutoPrompt = function() {
    if (document.getElementById('tuto-dont-show-again').checked) localStorage.setItem('mj_tuto_hide', 'true');
    document.getElementById('modal-tuto-prompt').style.display = 'none';
};

const tutoStepsPhase0 = [
    { target: 'global-mj-logo-container', title: "👋 Votre Carte de Visite MJ", text: "Bienvenue dans <b>Buz'ta Puce</b> !<br><br>En cliquant sur ce logo animé, vous personnalisez votre nom d'animateur, votre logo pro, vos blasons et vos fonds d'écran." },
    { target: 'btn-choice-new-room', title: "🆕 Créer une Salle", text: "Cliquez maintenant sur <b>Créer une nouvelle salle</b> pour configurer votre premier événement d'entraînement.", autoAction: 'click' }
];

const tutoStepsPhase1 = [
    { target: 'new-room-mj', title: "🎤 Nom d'Animateur", text: "Votre prénom d'animateur est pré-rempli automatiquement et s'affichera sur les téléphones des invités." },
    { target: 'new-room-name', title: "🎉 Nom de l'Événement", text: "Tapez un nom d'événement (ex : <b>Soirée Test</b>) puis cliquez sur <b>Suivant</b>." },
    { target: 'new-room-login', title: "🔐 Parcours Joueurs", text: "<b>Complet :</b> Propose un compte fidélité.<br><b>Rapide :</b> Entrée immédiate avec un simple pseudo.<br><br><i>Choisissez une option ou cliquez sur Suivant.</i>" },
    { target: 'new-room-mode', title: "⚔️ Mode de Jeu", text: "En soirée réelle, choisissez entre <b>Mixte</b>, <b>100% Solo</b> ou <b>100% Équipes</b> (ici fixé sur Mixte pour l'entraînement)." },
    { target: 'new-room-team-lock', title: "🛑 Règle d'Erreur", text: "Décidez si une mauvaise réponse bloque <b>uniquement le joueur</b> ou <b>toute sa table</b>." },
    { target: 'btn-launch-room', title: "🚀 Ouvrir le Cockpit !", text: "Tout est prêt ! Cliquez sur <b>LANCER LA PARTIE</b> pour entrer en régie.", autoAction: 'click' }
];

const tutoStepsPhase2 = [
    { target: 'network-status-container', title: "📡 Sécurité Anti-Coupure", text: "Simulation : micro-coupure Wi-Fi (voyant 🔴) !<br><br><b>Cliquez sur le bouton 🔄 juste à droite</b> pour rouvrir instantanément l'accès à la salle.", overrideTarget: 'btn-repair-network', waitManualHook: true },
    { target: 'tuto-zone-rules', title: "☀️ Mode Jour & Règles", text: "Animation en plein soleil ? <b>Cliquez sur ☀️ MODE JOUR</b> : la console ET les <b>5 téléphones en bas</b> passent instantanément sur fond blanc !<br><br><i>Cliquez ensuite sur Suivant.</i>" },
    { target: 'tuto-zone-buzz', title: "🔊 Ouvrez les Buzzers !", text: "Lancez votre musique et <b>cliquez sur Ouvrir Buzzers</b> : les 5 buzzers en bas vont passer au <b>VERT lumineux (BUZZEZ !)</b>.", overrideTarget: 'btn-open-buzz', waitManualHook: true },
    { target: 'simu-phones-container', title: "⚡ Simulez un Joueur !", text: "Cliquez sur le buzzer vert d'un des <b>5 téléphones en bas</b> (ex : <b>Marie</b> ou <b>Ninja</b>) !<br><br>Il prendra la main en <b>Bleu (C'EST À TOI !)</b> et son coéquipier verra aussi <b>BIEN JOUÉ !</b>.", waitManualHook: true },
    { target: 'player-box', title: "⚖️ Arbitrage des Points", text: "Le cadre des points s'éclaire !<br>• <b>+3 / +1 (Terminé)</b> : attribue les points et referme les buzzers.<br>• <b>+1 (On continue)</b> : donne 1 pt, bloque ce joueur et <b>rouvre en vert</b> aux autres !<br>• <b>Erreur</b> : bloque ce joueur et rouvre aux autres.<br><br><b>Cliquez sur l'un des 4 boutons éclairés !</b>", waitManualHook: true },
    { target: 'tuto-zone-teams', title: "🛡️ Clans & Capitaines", text: "Déployez une équipe (flèche <b>▶</b>) pour voir ses membres, ajouter des bonus <b>+/-</b> ou transférer la couronne de Capitaine <b>👑</b>." },
    { target: 'tuto-zone-players', title: "👥 Modération Express", text: "Cliquez sur le menu <b>⋮</b> d'un joueur pour tester <b>Forcer le buzzer</b> (main levée), un <b>Carton Jaune 🟨</b>, l'<b>Expulsion 🟥</b> ou l'édition." },
    { target: null, title: "🎮 Mode Libre Débloqué !", text: "Le guidage est terminé : <b>toute la console est maintenant déverrouillée</b> !<br><br>Testez librement les 5 téléphones en bas, les règles et les scores. Cliquez sur <b>✖ Quitter le Bac à Sable</b> (ou <b>FIN DE PARTIE 🏆</b>) quand vous avez terminé." }
];

function getCurrentTutoSteps() {
    return tutoCurrentPhase === 0 ? tutoStepsPhase0 : (tutoCurrentPhase === 1 ? tutoStepsPhase1 : tutoStepsPhase2);
}

window.startTuto = function(phase, isForced = false) {
    let state = localStorage.getItem('mj_tuto_state_v3');
    if (!isForced) {
        if (phase === 0 && !state) { window.showTutoPrompt(); return; }
        else if (state === 'done') return;
        else if (phase !== 0 && state !== 'accepted') return;
    } else {
        if (phase === 0) localStorage.setItem('mj_tuto_state_v3', 'accepted');
    }

    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    if (tutoListener) { tutoListener.el.removeEventListener(tutoListener.type, tutoListener.fn); tutoListener = null; }

    window.isTutoRunning = true;
    document.body.classList.add('tuto-running');
    tutoCurrentPhase = phase;
    tutoCurrentStep = 0;
    tutoHighestStep[phase] = 0;

    document.getElementById('tuto-overlay').style.display = 'block';
    document.getElementById('tuto-tooltip').style.display = 'block';

    if (phase === 2) {
        window.isSandboxMode = true;
        document.body.classList.add('sandbox-active');
        injectFakeTutoData();
        document.getElementById('simu-phones-container').style.display = 'flex';
        document.getElementById('network-status-dot').innerText = '🔴';
        document.getElementById('network-status-dot').classList.add('pulse-alert');
    }

    showTutoStep();
};

window.unlockSandboxFreePlay = function() {
    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    if (tutoListener) { tutoListener.el.removeEventListener(tutoListener.type, tutoListener.fn); tutoListener = null; }
    window.isTutoRunning = false;
    document.body.classList.remove('tuto-running', 'tuto-step-5');
    const pBox = document.getElementById('player-box');
    if (pBox) pBox.style.marginTop = '';
    document.getElementById('tuto-overlay').style.display = 'none';
    document.getElementById('tuto-tooltip').style.display = 'none';
    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    const simuDock = document.getElementById('simu-phones-container');
    if (simuDock) simuDock.classList.remove('tuto-peek', 'tuto-highlight');
};

window.endTuto = function() {
    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    if (tutoListener) { tutoListener.el.removeEventListener(tutoListener.type, tutoListener.fn); tutoListener = null; }
    const wasSandbox = window.isSandboxMode;
    window.isTutoRunning = false;
    window.isSandboxMode = false;
    document.body.classList.remove('tuto-running', 'sandbox-active', 'tuto-step-5');
    const pBox = document.getElementById('player-box');
    if (pBox) pBox.style.marginTop = '';
    localStorage.setItem('mj_tuto_state_v3', 'done');
    document.getElementById('tuto-overlay').style.display = 'none';
    document.getElementById('tuto-tooltip').style.display = 'none';
    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    const simuDock = document.getElementById('simu-phones-container');
    if (simuDock) {
        simuDock.classList.remove('tuto-peek', 'tuto-highlight');
        simuDock.style.display = 'none';
    }
    if (wasSandbox) clearFakeTutoData();
};

window.prevTutoStep = function() {
    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    if (tutoCurrentStep > 0) {
        if (tutoCurrentStep > (tutoHighestStep[tutoCurrentPhase] || 0)) {
            tutoHighestStep[tutoCurrentPhase] = tutoCurrentStep;
        }
        tutoCurrentStep--;
        if (tutoCurrentPhase === 2) {
            if (tutoCurrentStep === 0) {
                document.getElementById('network-status-dot').innerText = '🔴';
                document.getElementById('network-status-dot').classList.add('pulse-alert');
            } else if (tutoCurrentStep === 2) {
                currentBlocked = {};
                statusUpdate('waiting');
            } else if (tutoCurrentStep === 3) {
                // Retour de 5/8 vers 4/8 : rouvre les buzzers en VERT pour permettre de re-cliquer un téléphone OU faire "Suivant ➔"
                currentBlocked = {};
                statusUpdate('ready');
            }
        }
        showTutoStep();
    }
};

window.nextTutoStep = function() {
    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    const steps = getCurrentTutoSteps();
    tutoCurrentStep++;
    if (tutoCurrentStep > (tutoHighestStep[tutoCurrentPhase] || 0)) {
        tutoHighestStep[tutoCurrentPhase] = tutoCurrentStep;
    }
    if (tutoCurrentStep >= steps.length) {
        if (tutoCurrentPhase === 2) {
            window.unlockSandboxFreePlay();
        } else {
            document.getElementById('tuto-tooltip').style.display = 'none';
            document.getElementById('tuto-overlay').style.display = 'none';
            document.body.classList.remove('tuto-running', 'tuto-step-5');
        }
    } else {
        showTutoStep();
    }
};

function activateSandboxPlayerForStep5(uid) {
    const fallbackUid = (uid && allPlayersData[uid] && !allPlayersData[uid].banned)
        ? uid
        : (Object.keys(allPlayersData).find(k => !allPlayersData[k].banned) || "t2");
    const p = allPlayersData[fallbackUid];
    if (!p) return;

    lastSimuBuzzerUid = fallbackUid;
    currentGameState = 'taken';
    currentBuzzerId = fallbackUid;
    currentPlayer = { id: fallbackUid, name: p.name, pseudo: p.name, teamName: p.teamName, avatar: p.avatar };
    if (!buzzHistory.includes(p.name)) buzzHistory.push(p.name);

    const btnOpenBuzz = document.getElementById('btn-open-buzz');
    if (btnOpenBuzz) { btnOpenBuzz.disabled = true; btnOpenBuzz.innerHTML = "🟢 BUZZERS OUVERTS"; }

    const box = document.getElementById('player-box');
    box.style.display = "block";
    document.getElementById('p-name').innerText = p.name;
    document.getElementById('p-avatar').innerHTML = (p.avatar && p.avatar.length > 20)
        ? `<img src="${p.avatar}" style="width:70px; height:70px; border-radius:50%; object-fit:cover;">`
        : (p.avatar || '👤');
    document.getElementById('p-team').innerHTML = (!p.teamName || p.teamName === "Solo")
        ? "Solo"
        : `<div class="crest-mini-bg"><img src="${globalTeams[p.teamName] ? globalTeams[p.teamName].icon : ''}" class="crest-mini"></div><span>${p.teamName}</span>`;

    updateSimuPhones();
    renderLobby();
    renderTeamLobby();
}

function showTutoStep() {
    const steps = getCurrentTutoSteps();
    const step = steps[tutoCurrentStep];
    if (!step) return;

    const hasVisitedLaterStep = tutoCurrentStep < (tutoHighestStep[tutoCurrentPhase] || 0);
    const pBox = document.getElementById('player-box');

    closeGlobalDropdown();
    document.querySelectorAll('.tuto-highlight').forEach(el => el.classList.remove('tuto-highlight'));
    if (pBox) pBox.style.marginTop = '';
    if (tutoListener) { tutoListener.el.removeEventListener(tutoListener.type, tutoListener.fn); tutoListener = null; }

    const isStep5 = (tutoCurrentPhase === 2 && tutoCurrentStep === 4);
    document.body.classList.toggle('tuto-step-5', isStep5);

    const simuDock = document.getElementById('simu-phones-container');
    if (tutoCurrentPhase === 2) {
        if (tutoCurrentStep === 3 && currentGameState !== 'ready') {
            currentBlocked = {};
            statusUpdate('ready');
        } else if (tutoCurrentStep === 4 && (currentGameState !== 'taken' || !currentPlayer || pBox.style.display === 'none')) {
            activateSandboxPlayerForStep5(lastSimuBuzzerUid);
        }

        if (simuDock) {
            if (step.target === 'simu-phones-container') {
                simuDock.classList.remove('tuto-peek');
            } else {
                simuDock.classList.add('tuto-peek');
            }
        }
    }

    const counterEl = document.getElementById('tuto-step-counter');
    if (counterEl) counterEl.innerText = `Étape ${tutoCurrentStep + 1} / ${steps.length}`;

    const btnPrev = document.getElementById('tuto-btn-prev');
    if (btnPrev) btnPrev.style.display = tutoCurrentStep > 0 ? 'inline-block' : 'none';

    document.getElementById('tuto-title').innerHTML = step.title;
    document.getElementById('tuto-text').innerHTML = step.text;

    const btnNext = document.getElementById('tuto-btn-next');
    btnNext.innerText = (tutoCurrentStep === steps.length - 1)
        ? (tutoCurrentPhase === 2 ? "Jouer librement 🚀" : "Suivant ➔")
        : "Suivant ➔";

    btnNext.onclick = function() {
        if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
        if (tutoCurrentPhase === 0 && tutoCurrentStep === 1) {
            askMjNameAndCreate();
            return;
        }
        if (tutoCurrentPhase === 1 && tutoCurrentStep === 1) {
            const eventInput = document.getElementById('new-room-name');
            if (!eventInput || eventInput.value.trim() === "") eventInput.value = "Soirée Démo";
        }
        if (tutoCurrentPhase === 1 && tutoCurrentStep === 5) {
            confirmCreateRoom();
            return;
        }
        if (tutoCurrentPhase === 2) {
            if (tutoCurrentStep === 0) {
                document.getElementById('network-status-dot').innerText = '🟢';
                document.getElementById('network-status-dot').classList.remove('pulse-alert');
            } else if (tutoCurrentStep === 2 && currentGameState === 'waiting') {
                currentBlocked = {};
                statusUpdate('ready');
            } else if (tutoCurrentStep === 3 && currentGameState !== 'taken') {
                activateSandboxPlayerForStep5(lastSimuBuzzerUid);
            } else if (tutoCurrentStep === 4 && currentGameState === 'taken') {
                statusUpdate('waiting');
            }
        }
        window.nextTutoStep();
    };

    const shouldShowNext = hasVisitedLaterStep || (!step.autoAction && !step.waitManualHook);
    btnNext.style.display = shouldShowNext ? 'block' : 'none';

    if (step.target) {
        const targetEl = document.getElementById(step.target);
        if (targetEl) {
            targetEl.classList.add('tuto-highlight');
            if (step.overrideTarget) {
                const overEl = document.getElementById(step.overrideTarget);
                if (overEl) overEl.classList.add('tuto-highlight');
            }

            if (step.autoAction) {
                const listenEl = step.overrideTarget ? document.getElementById(step.overrideTarget) : targetEl;
                if (listenEl) {
                    const expectedPhase = tutoCurrentPhase;
                    const expectedStep = tutoCurrentStep;
                    const fn = () => {
                        setTimeout(() => {
                            if (window.isTutoRunning && tutoCurrentPhase === expectedPhase && tutoCurrentStep === expectedStep) {
                                window.nextTutoStep();
                            }
                        }, 250);
                    };
                    listenEl.addEventListener(step.autoAction, fn);
                    tutoListener = { el: listenEl, type: step.autoAction, fn: fn };
                }
            }

            scrollAndPositionTooltip(targetEl);
        }
    } else {
        scrollAndPositionTooltip(null);
    }
}

function scrollAndPositionTooltip(targetEl) {
    const fixedTargets = ['simu-phones-container', 'top-right-tools', 'global-mj-logo-container'];
    const simuDock = document.getElementById('simu-phones-container');
    const hasDock = (tutoCurrentPhase === 2 && simuDock && simuDock.style.display !== 'none');
    const dockH = hasDock ? (simuDock.offsetHeight + 28) : 20;
    const safeViewportH = window.innerHeight - dockH;

    if (targetEl && !fixedTargets.includes(targetEl.id) && tutoCurrentPhase !== 1) {
        const rawRect = targetEl.getBoundingClientRect();
        const absTop = rawRect.top + window.scrollY;
        let desiredScrollY = window.scrollY;

        if (targetEl.id === 'player-box') {
            desiredScrollY = Math.max(0, absTop - 65);
        } else if (targetEl.id === 'tuto-zone-teams' || targetEl.id === 'tuto-zone-players') {
            desiredScrollY = Math.max(0, absTop - 35);
        } else if (rawRect.top < 55 || rawRect.bottom > safeViewportH - 20) {
            desiredScrollY = Math.max(0, absTop - 75);
        }

        if (Math.abs(desiredScrollY - window.scrollY) > 8) {
            window.scrollTo({ top: desiredScrollY, behavior: 'auto' });
        }
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => positionTooltip(targetEl));
    });
}

function positionTooltip(targetEl) {
    const tooltip = document.getElementById('tuto-tooltip');
    if (!tooltip || tooltip.style.display === 'none') return;
    tooltip.style.transform = 'none';

    const simuDock = document.getElementById('simu-phones-container');
    const playerBox = document.getElementById('player-box');
    const hasDock = (tutoCurrentPhase === 2 && simuDock && simuDock.style.display !== 'none');
    const dockTopViewport = hasDock ? simuDock.getBoundingClientRect().top : window.innerHeight;
    const maxBottomViewport = hasDock ? (dockTopViewport - 14) : (window.innerHeight - 15);
    const ttW = tooltip.offsetWidth || 325;
    const ttH = tooltip.offsetHeight || 220;

    const clampTopViewport = (vTop) => {
        const maxTop = Math.max(12, maxBottomViewport - ttH);
        return Math.min(Math.max(12, vTop), maxTop);
    };
    const clampLeft = (vLeft) => Math.min(Math.max(12, vLeft), Math.max(12, window.innerWidth - ttW - 12));

    if (!targetEl) {
        const availH = Math.max(220, maxBottomViewport);
        tooltip.style.top = Math.max(20, window.scrollY + (availH - ttH) / 2) + 'px';
        tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
        return;
    }

    const rect = targetEl.getBoundingClientRect();

    // Phase 1 (Modale Nouvelle Salle) : décalé sur le côté de la modale
    if (tutoCurrentPhase === 1) {
        const createBox = document.querySelector('#modal-create-room .modal-box');
        if (createBox) {
            const mRect = createBox.getBoundingClientRect();
            if (mRect.right + ttW + 20 <= window.innerWidth) {
                tooltip.style.left = (mRect.right + 18) + 'px';
                tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top - 10))) + 'px';
                return;
            } else if (mRect.left - ttW - 20 >= 0) {
                tooltip.style.left = (mRect.left - ttW - 18) + 'px';
                tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top - 10))) + 'px';
                return;
            }
        }
    }

    // Étape 4/8 : Les 5 téléphones virtuels en bas -> Bulle juste au-dessus des téléphones
    if (targetEl.id === 'simu-phones-container') {
        tooltip.style.top = (window.scrollY + Math.max(12, rect.top - ttH - 16)) + 'px';
        tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
        return;
    }

    // Étape 5/8 : Encart d'arbitrage #player-box -> TOUJOURS décalé sur le côté (jamais sur les buzzers ni sur #player-box)
    if (targetEl.id === 'player-box') {
        if (playerBox) playerBox.style.marginTop = '';
        if (rect.right + ttW + 18 <= window.innerWidth) {
            tooltip.style.left = (rect.right + 16) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        } else if (rect.left - ttW - 18 >= 0) {
            tooltip.style.left = (rect.left - ttW - 16) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        } else {
            tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
            tooltip.style.top = (window.scrollY + 12) + 'px';
            if (playerBox) playerBox.style.marginTop = (ttH + 22) + 'px';
        }
        return;
    }

    // Étape 6/8 : Lobby des Équipes (gauche) -> Bulle posée à droite
    if (targetEl.id === 'tuto-zone-teams' && rect.right + ttW + 20 <= window.innerWidth) {
        tooltip.style.left = (rect.right + 20) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top))) + 'px';
        return;
    }

    // Étape 7/8 : Lobby Joueurs (droite) -> Bulle posée à gauche
    if (targetEl.id === 'tuto-zone-players' && rect.left - ttW - 20 >= 0) {
        tooltip.style.left = (rect.left - ttW - 20) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top))) + 'px';
        return;
    }

    // Étape 3/8 : Zone Buzzers gauche -> Bulle juste à droite des 2 boutons
    if (targetEl.id === 'tuto-zone-buzz' && rect.right + ttW + 20 <= window.innerWidth) {
        tooltip.style.left = (rect.right + 18) + 'px';
        tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top))) + 'px';
        return;
    }

    // Étape 2/8 : Zone Règles & Mode Jour -> Décalé à droite de la carte salle
    if (targetEl.id === 'tuto-zone-rules') {
        const roomCard = document.getElementById('room-info-card');
        if (roomCard) {
            const cardRect = roomCard.getBoundingClientRect();
            if (cardRect.right + ttW + 20 <= window.innerWidth) {
                tooltip.style.left = (cardRect.right + 16) + 'px';
                tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(16, rect.top - 10))) + 'px';
                return;
            }
        }
    }

    let vTop;
    if (rect.bottom + ttH + 18 <= maxBottomViewport) {
        vTop = rect.bottom + 14;
    } else if (rect.top - ttH - 18 >= 12) {
        vTop = rect.top - ttH - 14;
    } else {
        vTop = clampTopViewport(rect.bottom + 12);
    }
    tooltip.style.top = (window.scrollY + vTop) + 'px';
    tooltip.style.left = clampLeft(rect.left + (rect.width / 2) - (ttW / 2)) + 'px';
}

function refreshSandboxRulesBadges() {
    const settings = window.roomSettings || { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual' };
    const badgeMode = document.getElementById('badge-game-mode');
    const badgeLock = document.getElementById('badge-team-lock');
    if (badgeMode && badgeLock) {
        if (settings.gameMode === 'solo_only') {
            badgeMode.innerText = "100% Solo";
            badgeMode.style.background = "#8e44ad";
            badgeLock.style.display = 'none';
        } else {
            badgeMode.innerText = settings.gameMode === 'team_only' ? "100% Équipes" : "Mode Mixte";
            badgeMode.style.background = settings.gameMode === 'team_only' ? "var(--success)" : "var(--blue)";
            badgeLock.style.display = 'inline-block';
            badgeLock.innerText = settings.teamLock === 'team' ? "🛑 Bloc. ÉQUIPE" : "🛑 Bloc. INDIV.";
        }
    }
}

function injectFakeTutoData() {
    savedRealRoomState = {
        dayMode: document.body.classList.contains('day-mode'),
        roomSettings: window.roomSettings ? { ...window.roomSettings } : { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual' }
    };
    window.roomSettings = { loginMode: 'full', gameMode: 'mixed', teamLock: 'individual' };
    refreshSandboxRulesBadges();

    globalTeams = {
        "Les Requins": { active: true, bonus: 0, icon: createBlason(1) },
        "Les Tigres": { active: true, bonus: 0, icon: createBlason(0) }
    };
    allPlayersData = {
        "t1": { uid: "t1", name: "Alex", teamName: "Les Requins", active: true, pts: 5, isCaptain: true, avatar: "😎", hasBeenWarned: false },
        "t2": { uid: "t2", name: "Marie", teamName: "Les Requins", active: true, pts: 2, isCaptain: false, avatar: "👩‍🚀", hasBeenWarned: false },
        "t3": { uid: "t3", name: "Sam", teamName: "Les Tigres", active: true, pts: 4, isCaptain: true, avatar: "🤠", hasBeenWarned: false },
        "t4": { uid: "t4", name: "Tom", teamName: "Les Tigres", active: true, pts: 1, isCaptain: false, avatar: "👽", hasBeenWarned: false },
        "t5": { uid: "t5", name: "Ninja", teamName: "Solo", active: true, pts: 8, isCaptain: false, avatar: "🥷", hasBeenWarned: false }
    };
    lastSimuBuzzerUid = "t2";
    currentBuzzerId = null;
    currentPlayer = null;
    currentGameState = 'waiting';
    currentBlocked = {};
    buzzHistory = [];

    document.getElementById('player-box').style.display = "none";
    const btnOpenBuzz = document.getElementById('btn-open-buzz');
    if (btnOpenBuzz) { btnOpenBuzz.disabled = false; btnOpenBuzz.innerHTML = "Ouvrir Buzzers"; }

    renderLobby();
    renderTeamLobby();
    buildSimuPhones();
    updateSimuPhones();
}

function clearFakeTutoData() {
    document.getElementById('player-box').style.display = "none";
    document.getElementById('simu-phones-container').style.display = "none";
    document.getElementById('network-status-dot').innerText = '🟢';
    document.getElementById('network-status-dot').classList.remove('pulse-alert');

    if (savedRealRoomState) {
        const btnDay = document.getElementById('btn-day-mode');
        if (savedRealRoomState.dayMode) {
            document.body.classList.add('day-mode');
            if (btnDay) btnDay.innerHTML = "🌙 MODE NUIT";
        } else {
            document.body.classList.remove('day-mode');
            if (btnDay) btnDay.innerHTML = "☀️ MODE JOUR";
        }
        window.roomSettings = savedRealRoomState.roomSettings;
        refreshSandboxRulesBadges();
        savedRealRoomState = null;
    }

    if (roomRef) {
        roomRef.once('value').then(snap => {
            const rData = snap.val() || {};
            globalTeams = rData.teams || {};
            allPlayersData = {};
            const rawP = rData.players || {};
            Object.keys(rawP).forEach(uid => {
                if (rawP[uid] && rawP[uid].name && rawP[uid].name !== "undefined") {
                    allPlayersData[uid] = { uid: uid, ...rawP[uid] };
                }
            });
            currentBlocked = rData.blockedPlayers || {};
            currentGameState = (rData.gameState && rData.gameState.status) ? rData.gameState.status : 'waiting';
            currentBuzzerId = (rData.buzzers && rData.buzzers.id) ? rData.buzzers.id : null;
            currentPlayer = currentBuzzerId && allPlayersData[currentBuzzerId] ? { id: currentBuzzerId, ...allPlayersData[currentBuzzerId] } : null;
            const btnOpenBuzz = document.getElementById('btn-open-buzz');
            if (btnOpenBuzz) {
                const openStates = ['ready', 'taken', 'processing'];
                btnOpenBuzz.disabled = openStates.includes(currentGameState);
                btnOpenBuzz.innerHTML = openStates.includes(currentGameState) ? "🟢 BUZZERS OUVERTS" : "Ouvrir Buzzers";
            }
            renderLobby();
            renderTeamLobby();
        });
    } else {
        globalTeams = {}; allPlayersData = {}; currentBlocked = {}; currentBuzzerId = null; currentPlayer = null; currentGameState = 'waiting';
        renderLobby(); renderTeamLobby();
    }
}

function buildSimuPhones() {
    const container = document.getElementById('simu-phones-row');
    if (!container) return;
    container.innerHTML = "";

    Object.keys(allPlayersData).forEach(uid => {
        const p = allPlayersData[uid];
        const card = document.createElement('div');
        card.className = 'simu-phone';
        card.id = 'simu-ph-' + uid;
        card.title = `Téléphone virtuel de ${p.name} — Cliquez pour buzzer`;

        const crown = p.isCaptain ? ' 👑' : '';
        const warn = p.hasBeenWarned ? ' 🟨' : '';
        const avHtml = (p.avatar && p.avatar.length > 20) ? `<img src="${p.avatar}">` : (p.avatar || '👤');

        card.innerHTML = `
            <div class="simu-kicked" id="simu-kick-${uid}">Banni 🟥</div>
            <div class="simu-notch"></div>
            <div class="simu-avatar" id="simu-av-${uid}">${avHtml}</div>
            <div class="simu-name" id="simu-nm-${uid}">${p.name}${crown}${warn}</div>
            <div class="simu-team" id="simu-tm-${uid}">${(!p.teamName || p.teamName === 'Solo') ? 'Solo' : '🛡️ ' + p.teamName}</div>
            <div class="simu-pts" id="simu-pt-${uid}">Score : ${p.pts || 0} pt${(p.pts||0)>1?'s':''}</div>
            <div class="simu-buzzer wait" id="simu-bz-${uid}" onclick="simuClickBuzzer('${uid}')">ATTENDEZ</div>
        `;
        container.appendChild(card);
    });
}

function updateSimuPhones() {
    if (!window.isSandboxMode) return;
    const winnerTeam = (currentPlayer && currentPlayer.teamName && currentPlayer.teamName !== "Solo") ? currentPlayer.teamName : null;

    Object.keys(allPlayersData).forEach(uid => {
        const p = allPlayersData[uid];
        const bz = document.getElementById('simu-bz-' + uid);
        const kickEl = document.getElementById('simu-kick-' + uid);
        const avEl = document.getElementById('simu-av-' + uid);
        const nmEl = document.getElementById('simu-nm-' + uid);
        const tmEl = document.getElementById('simu-tm-' + uid);
        const ptEl = document.getElementById('simu-pt-' + uid);
        if (!bz) return;

        if (avEl) avEl.innerHTML = (p.avatar && p.avatar.length > 20) ? `<img src="${p.avatar}">` : (p.avatar || '👤');
        if (nmEl) nmEl.innerText = p.name + (p.isCaptain ? ' 👑' : '') + (p.hasBeenWarned ? ' 🟨' : '');
        if (tmEl) tmEl.innerText = (!p.teamName || p.teamName === 'Solo') ? 'Solo' : '🛡️ ' + p.teamName;
        if (ptEl) ptEl.innerText = `Score : ${p.pts || 0} pt${(p.pts||0)>1?'s':''}`;

        if (p.banned) { kickEl.style.display = "flex"; return; }
        else { kickEl.style.display = "none"; }

        if (currentGameState === 'waiting') {
            bz.className = "simu-buzzer wait";
            bz.innerText = "ATTENDEZ";
        } else if (currentGameState === 'ready') {
            if (currentBlocked[p.name]) {
                bz.className = "simu-buzzer blocked";
                bz.innerText = "BLOQUÉ";
            } else {
                bz.className = "simu-buzzer ready";
                bz.innerText = "BUZZEZ !";
            }
        } else if (currentGameState === 'taken') {
            if (currentBuzzerId === uid) {
                bz.className = "simu-buzzer taken";
                bz.innerText = "C'EST À TOI !";
            } else if (winnerTeam && p.teamName === winnerTeam) {
                bz.className = "simu-buzzer taken";
                bz.innerText = "BIEN JOUÉ !";
            } else if (currentBlocked[p.name]) {
                bz.className = "simu-buzzer blocked";
                bz.innerText = "BLOQUÉ";
            } else {
                bz.className = "simu-buzzer blocked";
                bz.innerText = "OCCUPÉ";
            }
        }
    });
}

function simuClickBuzzer(uid) {
    if (!window.isSandboxMode) return;
    const p = allPlayersData[uid];
    if (!p || p.banned) return;

    const isStep4 = (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 3);
    if (!isStep4 && currentGameState !== 'ready') return;
    if (currentBlocked[p.name]) return;

    activateSandboxPlayerForStep5(uid);

    if (isStep4) {
        if (tutoAdvanceTimer) clearTimeout(tutoAdvanceTimer);
        const hasTeammate = p.teamName && p.teamName !== 'Solo' &&
            Object.keys(allPlayersData).some(k => k !== uid && allPlayersData[k].teamName === p.teamName && !allPlayersData[k].banned);
        const textEl = document.getElementById('tuto-text');
        if (textEl) {
            textEl.innerHTML = `✅ <b>${p.name}</b> a pris la main en <b>Bleu (C'EST À TOI !)</b>${hasTeammate ? " et son équipe voit <b>BIEN JOUÉ !</b>" : ""} !<br><br><i>Ouverture du cadre d'arbitrage des points...</i>`;
        }
        const simuDock = document.getElementById('simu-phones-container');
        positionTooltip(simuDock);

        // Pause visuelle confortable (1,25 s) sur le buzzer BLEU avant de passer à l'arbitrage (Étape 5/8)
        tutoAdvanceTimer = setTimeout(() => {
            tutoAdvanceTimer = null;
            if (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 3) {
                window.nextTutoStep();
            }
        }, 1250);
    }
}

window.addEventListener('resize', () => {
    const tooltip = document.getElementById('tuto-tooltip');
    if (!window.isTutoRunning || !tooltip || tooltip.style.display === 'none') return;
    const steps = getCurrentTutoSteps();
    const step = steps[tutoCurrentStep];
    if (!step) return;
    const targetEl = step.target ? document.getElementById(step.target) : null;
    positionTooltip(targetEl);
});
