/* ============================================================================
 * mj-tuto.js — Simulateur Bac à Sable (5 Téléphones) & Tutoriel Guidé Interactif
 * Console MJ Pro - Buz'Ta Puce (v1.303)
 * ============================================================================ */

let tutoStep4Buzzed = false;
let tutoStep5Arbitrated = false;

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
    { target: 'global-mj-logo-container', title: "👋 Votre Carte de Visite MJ", text: "Bienvenue dans <b>Buz'ta Puce</b> !<br><br>Cliquez sur ce <b>logo animé en haut à gauche</b> pour ouvrir et découvrir votre Carte de Visite (nom d'animateur, logo pro, blasons et fonds), ou cliquez sur <b>Suivant ➔</b>." },
    { target: 'btn-choice-new-room', title: "🆕 Créer une Salle", text: "Cliquez maintenant sur <b>Créer une nouvelle salle</b> pour configurer votre premier événement d'entraînement.", autoAction: 'click' }
];

const tutoStepsPhase1 = [
    { target: 'new-room-mj', title: "🎤 Nom d'Animateur", text: "Votre prénom d'animateur est pré-rempli automatiquement et s'affichera sur les téléphones des invités." },
    { target: 'new-room-name', title: "🎉 Nom de l'Événement", text: "Tapez un nom d'événement (ex : <b>Soirée Test</b>) puis cliquez sur <b>Suivant ➔</b>." },
    { target: 'new-room-login', title: "🔐 Parcours Joueurs", text: "<b>Complet :</b> Propose un compte fidélité.<br><b>Rapide :</b> Entrée immédiate avec un simple pseudo.<br><br><i>Choisissez une option puis cliquez sur Suivant ➔.</i>" },
    { target: 'new-room-mode', title: "⚔️ Mode de Jeu", text: "En soirée réelle, choisissez entre <b>Mixte</b>, <b>100% Solo</b> ou <b>100% Équipes</b> (ici fixé sur Mixte pour l'entraînement)." },
    { target: 'new-room-team-lock', title: "🛑 Règle de Blocage", text: "Décidez si une erreur (ou un <b>+1 On continue</b>) bloque <b>uniquement le joueur</b> ou <b>toute son équipe</b> !<br><br><i>Votre choix sera directement appliqué dans le Bac à Sable.</i>" },
    { target: 'btn-launch-room', title: "🚀 Ouvrir le Cockpit !", text: "Tout est prêt ! Cliquez sur <b>LANCER LA PARTIE</b> pour entrer en régie.", autoAction: 'click' }
];

const tutoStepsPhase2 = [
    { target: 'network-status-container', title: "📡 Sécurité Anti-Coupure", text: "Simulation : micro-coupure Wi-Fi (voyant 🔴) !<br><br><b>Cliquez sur le bouton 🔄 juste à droite</b> pour rouvrir instantanément l'accès à la salle.", overrideTarget: 'btn-repair-network', waitManualHook: true },
    { target: 'tuto-zone-rules', title: "☀️ Mode Jour & Règles", text: "Animation en plein soleil ? <b>Cliquez sur ☀️ MODE JOUR</b> pour passer la console en haute luminosité (recliquez pour revenir en <b>🌙 MODE NUIT</b>). Vous pouvez aussi ajuster vos <b>⚙️ RÈGLES DU JEU</b>.<br><br><i>Cliquez ensuite sur <b>Suivant ➔</b>.</i>" },
    { target: 'tuto-zone-buzz', title: "🔊 Ouvrez les Buzzers !", text: "Lancez votre musique et <b>cliquez sur Ouvrir Buzzers</b> pour débloquer les téléphones des joueurs en <b>VERT (BUZZEZ !)</b>.", overrideTarget: 'btn-open-buzz', waitManualHook: true },
    { target: 'simu-phones-container', title: "⚡ Simulez un Joueur !", text: "Voici vos <b>5 téléphones virtuels</b> passés au <b>VERT</b> !<br><br><b>Cliquez sur l'un des buzzers verts</b> (ex : <b>Sam</b> au milieu ou <b>Marie</b>) pour voir la prise de main en direct.", waitManualHook: true },
    { target: 'player-box', title: "⚖️ Arbitrage des Points", text: "Le cadre des points s'éclaire !<br>• <b>+3 / +1 (Terminé)</b> : attribue les points et referme les buzzers.<br>• <b>+1 (On continue)</b> : donne 1 pt, bloque ce joueur (ou son équipe) et <b>rouvre en vert</b> aux autres !<br>• <b>Erreur</b> : bloque ce joueur (ou son équipe) et rouvre aux autres.<br><br><b>Cliquez sur l'un des 4 boutons éclairés !</b>", waitManualHook: true },
    { target: 'tuto-zone-teams', title: "🛡️ Clans & Capitaines", text: "Déployez une équipe (flèche <b>▶</b>) pour voir ses membres, ajouter des bonus <b>+/-</b> ou transférer la couronne de Capitaine <b>👑</b>." },
    { target: 'tuto-zone-players', title: "👥 Modération Express", text: "Cliquez sur le menu <b>⋮</b> d'un joueur pour tester <b>Forcer le buzzer</b> (main levée), un <b>Carton Jaune 🟨</b>, l'<b>Expulsion 🟥</b> ou l'édition." },
    { target: null, title: "🎮 Mode Libre Débloqué !", text: "Le guidage est terminé : <b>toute la console est maintenant déverrouillée</b> !<br><br>Testez librement les 5 téléphones en bas, les règles et les scores. Cliquez sur <b>✖ Quitter le Bac à Sable</b> (ou <b>FIN DE PARTIE 🏆</b>) quand vous avez terminé." }
];

function getCurrentTutoSteps() {
    return tutoCurrentPhase === 0 ? tutoStepsPhase0 : (tutoCurrentPhase === 1 ? tutoStepsPhase1 : tutoStepsPhase2);
}

// Ferme proprement la Carte de Visite MJ et ses sous-modales éventuelles avant de passer à l'étape "Créer une nouvelle salle"
function ensureProfileClosedForTuto() {
    const lb = document.getElementById('univ-lightbox');
    if (lb && lb.style.display !== 'none') closeLightbox();
    const mLib = document.getElementById('modal-library');
    if (mLib && mLib.style.display !== 'none') closeLibrary();
    const mBg = document.getElementById('modal-bg-library');
    if (mBg && mBg.style.display !== 'none') closeBgLibrary();
    const mAb = document.getElementById('modal-about');
    if (mAb && mAb.style.display !== 'none') mAb.style.display = 'none';

    const profEl = document.getElementById('screen-profile');
    if (profEl && profEl.style.display === 'block') {
        profEl.style.display = 'none';
        profEl.classList.remove('tuto-highlight');
        document.body.classList.remove('tuto-profile-open');
        const choiceEl = document.getElementById('screen-choice');
        if (choiceEl) choiceEl.style.display = 'block';
    }
}

// Appelé automatiquement quand le MJ clique sur le logo en haut à gauche pendant l'étape 1/2
window.onTutoProfileOpened = function() {
    if (!window.isTutoRunning || tutoCurrentPhase !== 0 || tutoCurrentStep !== 0) return;
    const profEl = document.getElementById('screen-profile');
    if (!profEl) return;
    document.body.classList.add('tuto-profile-open');
    profEl.classList.add('tuto-highlight');

    const titleEl = document.getElementById('tuto-title');
    const textEl = document.getElementById('tuto-text');
    if (titleEl) titleEl.innerHTML = "✨ Votre Carte de Visite MJ";
    if (textEl) {
        textEl.innerHTML = "Voici votre fiche en clair ! Vous pouvez personnaliser votre identité, votre logo, vos <b>🎨 Blasons</b> et vos <b>📺 Fonds</b>.<br><br>Cliquez sur <b>Retour</b> en bas de la fiche ou directement sur <b>Suivant ➔</b> pour créer votre salle.";
    }
    scrollAndPositionTooltip(profEl);
};

// Appelé automatiquement quand le MJ referme sa Carte de Visite pendant l'étape 1/2
window.onTutoProfileClosed = function() {
    if (!window.isTutoRunning || tutoCurrentPhase !== 0 || tutoCurrentStep !== 0) return;
    document.body.classList.remove('tuto-profile-open');
    const step = tutoStepsPhase0[0];
    const titleEl = document.getElementById('tuto-title');
    const textEl = document.getElementById('tuto-text');
    if (titleEl) titleEl.innerHTML = step.title;
    if (textEl) textEl.innerHTML = step.text;
    const logoEl = document.getElementById('global-mj-logo-container');
    if (logoEl) {
        logoEl.classList.add('tuto-highlight');
        scrollAndPositionTooltip(logoEl);
    }
};

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
    tutoStep4Buzzed = false;
    tutoStep5Arbitrated = false;

    document.getElementById('tuto-overlay').style.display = 'block';
    document.getElementById('tuto-tooltip').style.display = 'block';

    if (phase === 2) {
        window.isSandboxMode = true;
        document.body.classList.add('sandbox-active');
        injectFakeTutoData();
        const simuDock = document.getElementById('simu-phones-container');
        simuDock.classList.remove('tuto-peek', 'tuto-highlight');
        simuDock.style.display = 'flex'; // Affiché mais sous le voile noir (#tuto-overlay) jusqu'à l'étape 4/8 !
        document.getElementById('network-status-dot').innerText = '🔴';
        document.getElementById('network-status-dot').classList.add('pulse-alert');
    }

    showTutoStep();
};

window.unlockSandboxFreePlay = function() {
    if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
    if (tutoListener) { tutoListener.el.removeEventListener(tutoListener.type, tutoListener.fn); tutoListener = null; }
    window.isTutoRunning = false;
    document.body.classList.remove('tuto-running', 'tuto-step-5', 'tuto-profile-open');
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
    ensureProfileClosedForTuto();
    const wasSandbox = window.isSandboxMode;
    window.isTutoRunning = false;
    window.isSandboxMode = false;
    tutoStep4Buzzed = false;
    tutoStep5Arbitrated = false;
    document.body.classList.remove('tuto-running', 'sandbox-active', 'tuto-step-5', 'tuto-profile-open');
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
                // Retour de 5/8 vers 4/8 : rouvre tous les buzzers en VERT pour re-tester un buzz OU faire "Suivant ➔"
                tutoStep4Buzzed = false;
                currentBlocked = {};
                statusUpdate('ready');
            } else if (tutoCurrentStep === 4) {
                tutoStep5Arbitrated = false;
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
            document.body.classList.remove('tuto-running', 'tuto-step-5', 'tuto-profile-open');
        }
    } else {
        showTutoStep();
    }
};

function activateSandboxPlayerForStep5(uid) {
    const fallbackUid = (uid && allPlayersData[uid] && !allPlayersData[uid].banned)
        ? uid
        : (Object.keys(allPlayersData).find(k => !allPlayersData[k].banned) || "t3");
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

// Appelé à l'étape 5/8 après un clic sur +3, +1 (Terminé), +1 (On continue) ou Erreur :
// Garde les 5 téléphones éclairés et laisse tout le temps de lire et tester avant de cliquer sur "Suivant ➔"
window.onTutoStep5Arbitrated = function(actionType, pts, pName, pTeam, isTeamLock) {
    tutoStep5Arbitrated = true;
    document.body.classList.remove('tuto-step-5');

    const simuDock = document.getElementById('simu-phones-container');
    if (simuDock) {
        simuDock.classList.remove('tuto-peek');
        simuDock.classList.add('tuto-highlight');
    }

    const titleEl = document.getElementById('tuto-title');
    const textEl = document.getElementById('tuto-text');

    if (actionType === 'error') {
        if (titleEl) titleEl.innerHTML = "🛑 Erreur Enregistrée !";
        if (textEl) {
            if (isTeamLock) {
                textEl.innerHTML = `Avec votre règle <b>Blocage Équipe</b>, <b>${pName}</b> et toute son équipe (<b>${pTeam}</b>) sont maintenant <b>BLOQUÉS</b> en bas !<br><br>Les autres joueurs sont repassés au <b>VERT (BUZZEZ !)</b> : vous pouvez cliquer sur un buzzer vert pour finir la manche, ou cliquer sur <b>Suivant ➔</b>.`;
            } else {
                textEl.innerHTML = `Seul <b>${pName}</b> passe en <b>BLOQUÉ</b> (règle Individuelle) et tous les autres joueurs repassent au <b>VERT (BUZZEZ !)</b>.<br><br>Vous pouvez faire buzzer un autre joueur vert ou cliquer sur <b>Suivant ➔</b>.`;
            }
        }
    } else if (actionType === 'partial') {
        if (titleEl) titleEl.innerHTML = `👍 +${pts} pt (On continue) !`;
        if (textEl) {
            if (isTeamLock) {
                textEl.innerHTML = `<b>${pName}</b> marque <b>+${pts} pt</b> pour <b>${pTeam}</b>, puis <b>toute son équipe passe en BLOQUÉ</b> afin de laisser les autres tables trouver la suite en <b>VERT</b> !<br><br>Testez un autre buzzer vert ou cliquez sur <b>Suivant ➔</b>.`;
            } else {
                textEl.innerHTML = `<b>${pName}</b> marque <b>+${pts} pt</b> et passe en <b>BLOQUÉ</b> pendant que tous les autres repassent au <b>VERT</b>.<br><br>Testez un autre buzzer vert ou cliquez sur <b>Suivant ➔</b>.`;
            }
        }
    } else {
        if (titleEl) titleEl.innerHTML = `🏆 +${pts} pt${pts > 1 ? 's' : ''} (Manche Terminée) !`;
        if (textEl) {
            textEl.innerHTML = `Les points ont été attribués à <b>${pName}</b> et les 5 buzzers se sont refermés en <b>ROUGE (ATTENDEZ)</b> pour le prochain extrait.<br><br>Cliquez sur <b>Suivant ➔</b> pour découvrir la gestion des équipes !`;
        }
    }

    const btnNext = document.getElementById('tuto-btn-next');
    if (btnNext) btnNext.style.display = 'block';

    if (simuDock) positionTooltip(simuDock);
};

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

    // Sécurité Phase 0 : si on passe à l'étape 2/2 ("Créer une nouvelle salle"), on referme automatiquement la Carte de Visite MJ si elle était restée ouverte !
    if (tutoCurrentPhase === 0 && tutoCurrentStep === 1) {
        ensureProfileClosedForTuto();
    } else if (tutoCurrentPhase !== 0) {
        document.body.classList.remove('tuto-profile-open');
    }

    const isStep5 = (tutoCurrentPhase === 2 && tutoCurrentStep === 4);
    document.body.classList.toggle('tuto-step-5', isStep5);

    const simuDock = document.getElementById('simu-phones-container');
    if (tutoCurrentPhase === 2) {
        if (tutoCurrentStep === 3) {
            // Étape 4/8 : si on n'a pas encore buzzé sur cette étape, garantit que les 5 buzzers sont VERTS ("BUZZEZ !")
            if (!tutoStep4Buzzed && currentGameState !== 'ready') {
                currentBlocked = {};
                statusUpdate('ready');
            }
        } else if (tutoCurrentStep === 4) {
            // Étape 5/8 : garantit que #player-box est bien ouvert avec le joueur qui a buzzé
            if (!tutoStep5Arbitrated && (currentGameState !== 'taken' || !currentPlayer || pBox.style.display === 'none')) {
                activateSandboxPlayerForStep5(lastSimuBuzzerUid);
            }
        }

        // Visibilité des 5 téléphones virtuels :
        // - Étapes 1/8, 2/8, 3/8, 6/8, 7/8, 8/8 : DANS LE NOIR sous le voile sombre (#tuto-overlay)
        // - Étape 4/8 : éclairés via .tuto-highlight (cible directe)
        // - Étape 5/8 : éclairés via .tuto-peek pour voir en direct le blocage d'équipe/individuel
        if (simuDock) {
            if (tutoCurrentStep === 4) {
                simuDock.classList.add('tuto-peek');
            } else {
                simuDock.classList.remove('tuto-peek');
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
        if (tutoCurrentPhase === 0 && tutoCurrentStep === 0) {
            ensureProfileClosedForTuto();
        }
        if (tutoCurrentPhase === 0 && tutoCurrentStep === 1) {
            ensureProfileClosedForTuto();
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
            } else if (tutoCurrentStep === 3) {
                if (currentGameState !== 'taken') {
                    activateSandboxPlayerForStep5(lastSimuBuzzerUid);
                }
            } else if (tutoCurrentStep === 4) {
                // En quittant l'étape 5/8 vers 6/8, on referme proprement la manche en cours
                if (currentGameState !== 'waiting') {
                    currentBlocked = {};
                    statusUpdate('waiting');
                }
            }
        }
        window.nextTutoStep();
    };

    const stepUnlockedManually =
        (tutoCurrentPhase === 2 && tutoCurrentStep === 3 && tutoStep4Buzzed) ||
        (tutoCurrentPhase === 2 && tutoCurrentStep === 4 && tutoStep5Arbitrated);
    const shouldShowNext = hasVisitedLaterStep || stepUnlockedManually || (!step.autoAction && !step.waitManualHook);
    btnNext.style.display = shouldShowNext ? 'block' : 'none';

    // Si la Carte de Visite MJ est déjà ouverte à l'étape 1/2 (Phase 0), on l'éclaire directement !
    if (tutoCurrentPhase === 0 && tutoCurrentStep === 0) {
        const profEl = document.getElementById('screen-profile');
        if (profEl && profEl.style.display === 'block') {
            document.getElementById('global-mj-logo-container').classList.add('tuto-highlight');
            window.onTutoProfileOpened();
            return;
        }
    }

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

        if (targetEl.id === 'screen-profile') {
            desiredScrollY = 0;
        } else if (targetEl.id === 'player-box') {
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

    // Carte de Visite MJ (#screen-profile) ouverte à l'étape 1/2 : décalée à droite ou à gauche de la fiche
    if (targetEl.id === 'screen-profile') {
        if (rect.right + ttW + 18 <= window.innerWidth) {
            tooltip.style.left = (rect.right + 16) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top + 10))) + 'px';
        } else if (rect.left - ttW - 18 >= 0) {
            tooltip.style.left = (rect.left - ttW - 16) + 'px';
            tooltip.style.top = (window.scrollY + clampTopViewport(Math.max(20, rect.top + 10))) + 'px';
        } else {
            tooltip.style.left = clampLeft((window.innerWidth - ttW) / 2) + 'px';
            tooltip.style.top = (window.scrollY + 12) + 'px';
        }
        return;
    }

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

    // Les 5 téléphones virtuels en bas -> Bulle juste au-dessus des téléphones
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
    const existingSettings = window.roomSettings
        ? { ...window.roomSettings }
        : {
            loginMode: document.getElementById('new-room-login') ? document.getElementById('new-room-login').value : 'full',
            gameMode: 'mixed',
            teamLock: document.getElementById('new-room-team-lock') ? document.getElementById('new-room-team-lock').value : 'individual'
        };

    savedRealRoomState = {
        dayMode: document.body.classList.contains('day-mode'),
        roomSettings: { ...existingSettings }
    };

    // Préserve le choix réel du MJ sur la règle de blocage (Individuel ou Équipe) et le parcours joueur !
    window.roomSettings = {
        loginMode: existingSettings.loginMode || 'full',
        gameMode: 'mixed',
        teamLock: existingSettings.teamLock || 'individual'
    };
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
    lastSimuBuzzerUid = "t3";
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
            if (rData.settings) {
                window.roomSettings = rData.settings;
                refreshSandboxRulesBadges();
            }
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
    const isStep5FollowUp = (window.isTutoRunning && tutoCurrentPhase === 2 && tutoCurrentStep === 4);

    if (!isStep4 && currentGameState !== 'ready') return;
    if (currentBlocked[p.name]) return;

    activateSandboxPlayerForStep5(uid);

    if (isStep4) {
        if (tutoAdvanceTimer) { clearTimeout(tutoAdvanceTimer); tutoAdvanceTimer = null; }
        tutoStep4Buzzed = true;

        const hasTeammate = p.teamName && p.teamName !== 'Solo' &&
            Object.keys(allPlayersData).some(k => k !== uid && allPlayersData[k].teamName === p.teamName && !allPlayersData[k].banned);

        const titleEl = document.getElementById('tuto-title');
        const textEl = document.getElementById('tuto-text');
        if (titleEl) titleEl.innerHTML = `🔵 ${p.name} a pris la main !`;
        if (textEl) {
            if (hasTeammate) {
                textEl.innerHTML = `✅ Le buzzer de <b>${p.name}</b> est passé au <b>Bleu (C'EST À TOI !)</b> et son coéquipier chez <b>${p.teamName}</b> s'allume aussi en <b>Bleu (BIEN JOUÉ !)</b>, tandis que les autres téléphones affichent <b>OCCUPÉ</b>.<br><br>Cliquez sur <b>Suivant ➔</b> pour arbitrer les points !`;
            } else {
                textEl.innerHTML = `✅ Le buzzer de <b>${p.name}</b> (Solo) est passé au <b>Bleu (C'EST À TOI !)</b> et tous les autres téléphones affichent <b>OCCUPÉ</b>.<br><br>Cliquez sur <b>Suivant ➔</b> pour arbitrer les points !`;
            }
        }

        const btnNext = document.getElementById('tuto-btn-next');
        if (btnNext) btnNext.style.display = 'block';

        const simuDock = document.getElementById('simu-phones-container');
        if (simuDock) positionTooltip(simuDock);
    } else if (isStep5FollowUp) {
        // À l'étape 5/8, si le MJ reclique sur un buzzer vert après une Erreur ou un "+1 (On continue)"
        document.body.classList.add('tuto-step-5');
        const pBox = document.getElementById('player-box');
        if (pBox) pBox.classList.add('tuto-highlight');

        const simuDock = document.getElementById('simu-phones-container');
        if (simuDock) {
            simuDock.classList.remove('tuto-highlight');
            simuDock.classList.add('tuto-peek');
        }

        const titleEl = document.getElementById('tuto-title');
        const textEl = document.getElementById('tuto-text');
        if (titleEl) titleEl.innerHTML = `⚖️ ${p.name} reprend la main !`;
        if (textEl) {
            textEl.innerHTML = `Les joueurs bloqués n'ont pas pu buzzer, et <b>${p.name}</b> a pris la main !<br><br>Arbitrez sa réponse avec l'un des <b>4 boutons éclairés</b> ou cliquez sur <b>Suivant ➔</b>.`;
        }

        const btnNext = document.getElementById('tuto-btn-next');
        if (btnNext) btnNext.style.display = 'block';

        if (pBox) scrollAndPositionTooltip(pBox);
    }
}

window.addEventListener('resize', () => {
    const tooltip = document.getElementById('tuto-tooltip');
    if (!window.isTutoRunning || !tooltip || tooltip.style.display === 'none') return;
    if (tutoCurrentPhase === 0 && tutoCurrentStep === 0) {
        const profEl = document.getElementById('screen-profile');
        if (profEl && profEl.style.display === 'block') {
            positionTooltip(profEl);
            return;
        }
    }
    const steps = getCurrentTutoSteps();
    const step = steps[tutoCurrentStep];
    if (!step) return;
    const targetEl = step.target ? document.getElementById(step.target) : null;
    positionTooltip(targetEl);
});
