// ==UserScript==
// @name         Contests++
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Better contests with more information displayed, features, and tighter layout
// @author       infarctus
// @license      GPL-3.0
// @match        https://nutaku.haremheroes.com/activities.html*
// @match        https://*.hentaiheroes.com/activities.html*
// @match        https://*.gayharem.com/activities.html*
// @match        https://*.comixharem.com/activities.html*
// @match        https://*.hornyheroes.com/activities.html*
// @match        https://*.pornstarharem.com/activities.html*
// @match        https://*.transpornstarharem.com/activities.html*
// @match        https://*.gaypornstarharem.com/activities.html*
// @match        https://*.mangarpg.com/activities.html*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=haremheroes.com
// @updateURL    https://github.com/infarcactus-HH/Contests-plus-plus/raw/refs/heads/main/Contests-plus-plus.user.js
// @downloadURL  https://github.com/infarcactus-HH/Contests-plus-plus/raw/refs/heads/main/Contests-plus-plus.user.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
    "use strict";
    if (!$) {
        console.error("no jquerry");
        return;
    }
    const OLD_CONTEST_ACTIONS_PREFIX_KEY = "Actions : ";
    const CONTEST_ACTIONS_PREFIX_KEY = "Actions v2 : ";
    const INIT_PERMANENT_SETTINGS_KEY = "initPermanentSettings";
    const COLOR_POSITIVE_KEY = "colorPositive";
    const COLOR_NEGATIVE_KEY = "colorNegative";
    const TIEBREAKER_KEY = "tiebreaker";
    const TIEBREAKER_INVERTED_KEY = "tiebreakerInverted";
    const CLAIM_REWARDS_LOCK_KEY = "claimRewardsLock";
    const FIRST_SHOWN_KEY = "firstShown";
    const TOP4_SHOWN_KEY = "top4Shown";
    const TOP10_SHOWN_KEY = "top10Shown";
    const TOP25_SHOWN_KEY = "top25Shown";
    const TIGHTER_CONTEST_VIEW_KEY = "tighterContestView";

    const currentContestStoredVersion = 1;

    let computedContestID = []; // stores already done contests
    let positiveNegativeStyle; // stores the div for the positive and negative colors css
    let lockedRewardsStyle; // stores the div for the hidden claim rewards
    let tighterContestViewStyle; // stores the div for the tighter lead table css


    function initPermanentSettingsDefault() {
        GM_setValue(INIT_PERMANENT_SETTINGS_KEY, true);
        GM_setValue(COLOR_POSITIVE_KEY, "#23b56b");
        GM_setValue(COLOR_NEGATIVE_KEY, "#ec0039");
        GM_setValue(TIEBREAKER_KEY, true);
        GM_setValue(TIEBREAKER_INVERTED_KEY, false);
        GM_setValue(CLAIM_REWARDS_LOCK_KEY, false);
        GM_setValue(FIRST_SHOWN_KEY, true);
        GM_setValue(TOP4_SHOWN_KEY, true);
        GM_setValue(TOP10_SHOWN_KEY, false);
        GM_setValue(TOP25_SHOWN_KEY, false);
        GM_setValue(TOP15_SHOWN_KEY, false);
        GM_setValue(TOP30_SHOWN_KEY, false);
        GM_setValue(TIGHTER_CONTEST_VIEW_KEY,true);
    }

    function run1TimeAtScriptStart(){
        GM_addStyle(essentialStyle);
        GM_addStyle(customStyleTbodyInner);
        if (!GM_getValue(INIT_PERMANENT_SETTINGS_KEY, false)) {
            initPermanentSettingsDefault();
        }
        if( GM_getValue(TIGHTER_CONTEST_VIEW_KEY, true)){
            tighterContestViewStyle = GM_addStyle(tighterContestStyle);
        }
        const contestswitcher = $("[data-tab='contests']");
        contestswitcher.contents()[0].textContent = "Contests++";
        contestswitcher.attr("hh_title", "by infarctus");
        contestswitcher.attr("tooltip", "");
        injectContestsPlusPlusColor();
        $(".tabs-switcher > .slider[style*='left: 343px;']").css("left", "360px"); //scroll further if on pops
        $(".tabs-switcher > .slider[style*='width: 83.9']").css("width","102.703px"); //Make it bigger for the contests++
    }

    function run1TimeInContestTab(){
        if(GM_getValue(TIGHTER_CONTEST_VIEW_KEY,true)){
            changePreviousClickHandlers()
        }
        handleContest();
        if(GM_getValue(CLAIM_REWARDS_LOCK_KEY,false)){
            lockRewards()
        }
    }

    function BASE_GAME_c(t, n=!1, e=!1) {
        let i = $(`.right_part>.ranking[id_contest="${t}"]`).show().find(".lead_table_view");
        if (e)
            return void (i[0].scrollTop = 0);
        let o = i.find("tr.lead_table_default")
        , r = o[0].offsetTop + o.outerHeight()
        , a = r - i.outerHeight();
        r != i.outerHeight() && (n ? (i[0].scrollTop = 0,shared.animations.scrollElement(i[0], a, 200 + Math.abs(a / 2))) : i[0].scrollTop = a)
    }
    function changeSwitchTabScroll(){ // force scroll to where we want to not use the previous function
        if(!GM_getValue(TIGHTER_CONTEST_VIEW_KEY,true)){return;}
        const $currContestHeader = $(".contest_header_active")
        const contestId = $currContestHeader.parent().attr("id_contest")
        function a(t, n, ...e) {
            let i = $(".scroll_area")[0]
            , o = $(`.contest[id_contest="${t}"]`)[0].offsetTop - 55 - i.scrollTop;
            shared.animations.scrollElement(i, o, 200 + Math.abs(o), 0, n, e)
        }
        a(contestId, BASE_GAME_c, contestId, !0)
    }

    function changePreviousClickHandlers(){
        $(".contest_header").off("click")
        $(".contest_header").on("click.CPPreplace",(function(t) {
            if ("button" == t.target.localName)
                return;
            const n = $(this);
            let e = n.parent().attr("id_contest")
            , i = n.siblings("div.contest_body");
            i.is(":visible") ?
                (i.removeClass("show"),
                 $(".right_part>.ranking").hide(),
                 $(".right_part>.info").show(),
                 $(this).removeClass("contest_header_active"))
            : ($("div.contest_body").removeClass("show"),
               i.addClass("show"),
               $(".right_part>.ranking").hide(),
               $(".right_part>.info").hide(),
               $(".contest_header").removeClass("contest_header_active"),
               $(this).addClass("contest_header_active"),
               BASE_GAME_c(e, !1, !0),
               function(t, n, ...e) {
                let i = $(".scroll_area")[0]
                , o = $(`.contest[id_contest="${t}"]`)[0].offsetTop - 55 - i.scrollTop; // all of this to modify from 80 to 55
                shared.animations.scrollElement(i, o, 200 + Math.abs(o), 0, n, e)
            }(e, BASE_GAME_c, e, !0))
        }))
    }

    let currentcontestIDGlobal,currplayerindexGlobal,playersinformationGlobal,currentconteststoragekeyGlobal;

    // Helper function to call the current active contest
    function getCurrActiveContest() {
         return contests.active.find(x => x.id_contest == currentcontestIDGlobal) ||
             contests.finished.find(x => x.id_contest == currentcontestIDGlobal);
     }
    
    function handleContest(forcereloadfromupdate = false) {
        currentcontestIDGlobal = $(".contest_header_active")
            .parent()
            .attr("id_contest");
        if (!currentcontestIDGlobal) {
            return;
        }
        $(".left_part .contest > .contest_header")
            .off("click.handleContest")
            .on("click.handleContest", function () {
            $(".left_part .contest > .contest_header_active")
                .parent()
                .find(".BC-custom-objectives-table")
                .toggle(); // to do first since if it doesnt exist it will toggle it off
            handleContest();
            //toggle all non toggle off non current showed contest off
            $(".left_part .contest > .contest_header:not(.contest_header_active)")
                .parent()
                .find(".BC-custom-objectives-table")
                .not("[style*='display: none']")
                .toggle();
        });
        if (computedContestID.includes(currentcontestIDGlobal) && !forcereloadfromupdate) {
            return;
        }
        computedContestID.push(currentcontestIDGlobal);

        modifyTbdoyForCustomCSS();

        const currshowedcontestname = $(".contest_header_active > .contest_title_timer >.contest_title").text();
        const $contestpeople = $(".ranking[style='display: block;']  .leadTable").children();
        const $currplayer = $contestpeople.filter(".lead_table_default");
        currplayerindexGlobal = $contestpeople.index($currplayer);

        playersinformationGlobal = handleContestPeople($contestpeople, $currplayer);


        // if not owexists updates the storage to implement them
        const currActiveContest =
              contests.active.find(a => a.id_contest == currentcontestIDGlobal) !== undefined
        ? contests.active.find(a => a.id_contest == currentcontestIDGlobal)
        : contests.finished.find(a => a.id_contest == currentcontestIDGlobal)

        updateCurrentStorageIfNotExist(currshowedcontestname,currActiveContest);

        currentconteststoragekeyGlobal = CONTEST_ACTIONS_PREFIX_KEY + currshowedcontestname

        if (!forcereloadfromupdate) {
            generateObjectiveToggling(
                currplayerindexGlobal,
                playersinformationGlobal,
                currentconteststoragekeyGlobal
            );
            handleWeirdObjectives(currentcontestIDGlobal);
        }
        if(forcereloadfromupdate){
             $(".BC-custom-objectives-table")
                    .not("[style*='display: none']")
                    .remove();
        }
        generateCustomObjectives(
            currplayerindexGlobal,
            playersinformationGlobal,
            currentconteststoragekeyGlobal,
            currActiveContest
        );
    }
    function handleWeirdObjectives(currentcontestID) {
        //handles giving money contest
        const $objectivesmoney = $(
            ".contest_body.show .contest_objectives > div.donate"
        );
        if ($objectivesmoney.length) {
            $objectivesmoney
                .find("button")
                .off("click.handleGivingMoney")
                .on("click.handleGivingMoney", function () {
                 // removes current custom objective
                const observer = new MutationObserver(() => {
                    observer.disconnect();
                    handleContest(true);
                });
                observer.observe( document.querySelector(`.ranking[id_contest="${currentcontestID}"]`),
                                 { childList: true, subtree: true }
                                );
            });
        }
    }

    function generateObjectiveToggling(currplayerindex,playersinformation,currentconteststoragekey) {
        const objectivesinfo = GM_getValue(currentconteststoragekey, []);
        const $objectives = $(".contest_body.show .contest_objectives > div");
        let counter = 0;
        $objectives.each(function () {
            const $this = $(this);
            const descText = $this.find(".obj_desc").text().trim();

            // Find matching objective in storage
            const objective = objectivesinfo.objectives[counter];
            counter++;
            if (!objective) return;

            // Create diamond element
            const diamond = $('<div class="CPPdiamond"></div>')
            .toggleClass("unlocked", objective.activated)
            .toggleClass("locked", !objective.activated);

            // Insert as first element
            $this.prepend(diamond);

            // Add click handler to toggle status
            diamond.on("click", function (e) {
                e.stopPropagation();

                // Toggle activation state
                objective.activated = !objective.activated;

                // Update visual state
                diamond.toggleClass("unlocked locked");

                // Save updated objectives
                GM_setValue(currentconteststoragekey, objectivesinfo);

                //removes old objective custom
                const $currentcontestheader = $(
                    ".left_part .contest > .contest_header_active"
                );
                if (
                    $currentcontestheader.next().hasClass("BC-custom-objectives-table")
                ) {
                    $currentcontestheader.next().remove();
                }
                generateCustomObjectives(
                    currplayerindex,
                    playersinformation,
                    currentconteststoragekey,
                    getCurrActiveContest()
                );
            });
        });
    }
    function generateCustomObjectives(currplayerindex,playersinformation,currentconteststoragekey, currActiveContest) {
        const $currentcontestheader = $(
            ".left_part .contest > .contest_header_active"
        );
        if ($currentcontestheader.length == 0) {
            return;
        }
        if ($currentcontestheader.next().hasClass("BC-custom-objectives-table")) {
            return;
        } //already injected table
        const $currcontest = $(
            ".left_part .contest > .contest_header_active"
        ).parent();
        const objectives = GM_getValue(currentconteststoragekey, []).objectives;

        const hasActivatedObjective = objectives.some(
            (obj) => obj.activated === true
        );

        // Define positions to show based on settings
        const pullBrackets = Object.keys(currActiveContest.rewards).map(Number).sort((x, y) => x - y);
        const third_bracket_index = pullBrackets[2] - 1;
        const fourth_bracket_index = pullBrackets[3] - 1;
        const positions = [
            { key: FIRST_SHOWN_KEY, index: 0, label: "1st" },
            { key: TOP4_SHOWN_KEY, index: 3, label: "Top 4" },
            { key: TOP10_SHOWN_KEY, index: third_bracket_index, label: `Top ${third_bracket_index+1}` },
            { key: TOP25_SHOWN_KEY, index: fourth_bracket_index, label: `Top ${fourth_bracket_index+1}` }
        ];

        const activePositions = positions.filter((pos) =>
                                                 GM_getValue(
            pos.key,
            pos.key === FIRST_SHOWN_KEY || pos.key === TOP4_SHOWN_KEY
        )
                                                );

        // Create table header
        let tableHTML = `
      <table class="BC-custom-objectives-table"
             style="
                 width: 100%;
                 border-collapse: separate;
                 border-spacing: 0;
                 background: rgb(48, 9, 18);
                 color: #fff;
                 font-size: 12px;
                 border-radius: 4px;
                 overflow: hidden;
                 margin: 10px 0;
             ">
          <thead>
              <tr>
                  <th style="padding: 10px; border: 1px solid #702436; border-right: none; border-bottom: 2px solid #702436;">
                      Objective(s)
                      <span class="CPPsettings-btn" id="CPP-settings-btn">⚙️</span>
                  </th>`;

        activePositions.forEach((pos, index) => {
            const borderRight =
                  index === activePositions.length - 1 ? "" : "border-right: none;";
            tableHTML += `<th style="padding: 10px; border: 1px solid #702436; ${borderRight} border-bottom: 2px solid #702436;">${pos.label}</th>`;
        });

        tableHTML += `</tr></thead><tbody>`;

        // Helper function to calculate and format action values with colors
        function calculateAndFormatActions(playerIndex, targetPositionIndex, obj) {
            const playerPoints = playersinformation[playerIndex].points;
            const playerID = playersinformation[playerIndex].playerid;
            const targetPoints = playersinformation[targetPositionIndex].points;
            const targetID = playersinformation[targetPositionIndex].playerid;
            const competitorPoints =
                  playersinformation[targetPositionIndex + 1].points;
            const competitorID = playersinformation[targetPositionIndex + 1].playerid;

            const isInfront = playerIndex <= targetPositionIndex;
            let pointDiff, actions;

            if (isInfront) {
                // Player is ahead, calculate actions to stay ahead of competitor
                pointDiff = playerPoints - competitorPoints;
                actions = Math.ceil(pointDiff / obj.pointsPerAction);
                // Add 1 if same amount of points is exactly the diff
                if (
                    pointDiff === actions * obj.pointsPerAction &&
                    playerID < competitorID
                ) {
                    actions += 1;
                }
            } else {
                // Player is behind, calculate actions to reach target
                pointDiff = targetPoints - playerPoints;
                actions = Math.ceil(pointDiff / obj.pointsPerAction);
                // Add 1 if same amount of points but they have lower ID
                if (
                    pointDiff === actions * obj.pointsPerAction &&
                    playerID > targetID
                ) {
                    actions += 1;
                }
            }

            const color = isInfront
            ? "contestsplusplusnegative"
            : "contestspluspluspositive";
            const prefix = isInfront ? "x-" : "x";

            return `<span class="${color}">${prefix}${formatNumberWithCommas(
                actions
            )}</span>`;
        }

        objectives.forEach((obj, index) => {
            if (!obj.activated) return;

            // Add row with alternating background and borders
            const bgColor = index % 2 === 0 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.2)";
            tableHTML += `
        <tr style="background: ${bgColor};">
            <td style="padding: 10px; border: 1px solid #702436; border-right: none; border-top: none;">${obj.action}</td>`;

            activePositions.forEach((pos, posIndex) => {
                const display = calculateAndFormatActions(
                    currplayerindex,
                    pos.index,
                    obj
                );
                const borderRight =
                      posIndex === activePositions.length - 1 ? "" : "border-right: none;";
                tableHTML += `<td style="padding: 10px; border: 1px solid #702436; ${borderRight} border-top: none; text-align: center;">${display}</td>`;
            });

            tableHTML += `</tr>`;
        });

        tableHTML += `</tbody></table>`;

        $currcontest.children().eq(0).after(tableHTML);

        // Add settings button click handler
        $('.CPPsettings-btn').off('click.CPPsettings').on('click.CPPsettings', function(e) {
            e.stopPropagation();
            createSettingsPopup();
        });
    }
    function handleContestPeople($contestpeople, $currplayer) {
        const currpoints = parseInt(
            $currplayer
            .children()
            .filter(".cont_points_number")
            .text()
            .replace(/\D/g, '')
            ,10);
        const currplayerid = parseInt($currplayer.attr("sorting_id"), 10);

        let playersinformation = [];

        const tiebreakeractivated = GM_getValue(TIEBREAKER_KEY, true);
        const tiebreakerinverted = GM_getValue(TIEBREAKER_INVERTED_KEY, false);

        $contestpeople.each(function (index, element) {
            // Extract points from DOM element
            const points = parseInt( // TODO: use contest var for this
                $(this)
                .children()
                .filter(".cont_points_number")
                .text()
                .replace(/\D/g, '')
                ,10);

            // Add points display to table
            $(this).find("td").eq(1).after(handleShowingPoint(points, currpoints));

            // Extract player ID from attribute
            const playerid = parseInt($(this).attr("sorting_id"), 10);
            const IDdiff = currplayerid - playerid; // negative if account made earlier, positive if made later
            if(tiebreakeractivated && IDdiff != 0) { // IDdiff==0 if it's the player itself
                const $playernameflag = $(this).find("td").eq(1);

                const $flag = $playernameflag.contents().filter("span") // trims the right of the name
                const playerName = $playernameflag.contents()[2].textContent.trim()
                let newPlayerNameFlagHtml = $flag.prop('outerHTML'); // readds the flag
                newPlayerNameFlagHtml += `<span ${playerName.length >= 20 ? `tooltip="${playerName}"` : ""} class="CPPplayername">${playerName}</span>`;
                newPlayerNameFlagHtml += `<sup style="vertical-align: super; text-align: left;"`;


                // Determine the actual advantage/disadvantage for tooltip (unchanged)
                const hasAdvantage = IDdiff < 0;
                const tooltipText = hasAdvantage ? "tiebreaker advantage" : "tiebreaker disadvantage";

                // Determine the display symbol (affected by inverted setting)
                let displaySymbol;
                if (tiebreakerinverted) {
                    // When inverted, flip the display symbols
                    displaySymbol = hasAdvantage ? " -" : " +";
                } else {
                    // Normal behavior
                    displaySymbol = hasAdvantage ? " +" : " -";
                }

                newPlayerNameFlagHtml += ` tooltip='${tooltipText}'>${displaySymbol}`;
                newPlayerNameFlagHtml += "</sup>";

                $playernameflag.html(newPlayerNameFlagHtml);
            }

            // Store both player ID and points in an object
            playersinformation.push({
                playerid: playerid,
                points: points,
            });
        });

        return playersinformation;
    }
    function handleShowingPoint(oponnentpoints, currpoints) {
        const diff = oponnentpoints - currpoints;
        const stringtoshow = formatNumberWithCommas(diff);
        if (diff < 0) {
            return `<td class="contestsplusplusnegative" >${stringtoshow}</td>`;
        } else if (diff == 0) {
            return `<td></td>`;
        } else {
            return `<td class="contestspluspluspositive">+${stringtoshow}</td>`;
        }
    }
    function updateCurrentStorageIfNotExist(currshowedcontestname,currActiveContest) {
        const oldContestStorageKey = OLD_CONTEST_ACTIONS_PREFIX_KEY + currshowedcontestname
        let oldContestStored;
        let isoldContestStoredV2 = false;

        if(GM_getValue(oldContestStorageKey, false)){
            oldContestStored = GM_getValue(oldContestStorageKey)
            GM_deleteValue(oldContestStorageKey)
        }
        const currentconteststoragekey = CONTEST_ACTIONS_PREFIX_KEY + currshowedcontestname
        if (GM_getValue(currentconteststoragekey, false) && GM_getValue(currentconteststoragekey, []).version === currentContestStoredVersion) {
            return;
        } // returns if exists
        if(GM_getValue(currentconteststoragekey, false) && GM_getValue(currentconteststoragekey, []).version && GM_getValue(currentconteststoragekey, []).version !== currentContestStoredVersion){
            oldContestStored = GM_getValue(currentconteststoragekey)
            isoldContestStoredV2 = true;
        }

        const objectivesData = [];
        const defaultActivation = currActiveContest.objectives.length <= 4 ? true : false; // if there's too many don't set them to true
        let donationcount = 0;
        currActiveContest.objectives.forEach((objective,index) => {
            if(objective.identifier === "donate_sc"){
                donation_amounts.forEach((amount,index2) => {
                    objectivesData.push({
                        action: objective.name+" "+number_reduce(amount),
                        pointsPerAction: amount/sc_base,
                        activated: oldContestStored === undefined ? defaultActivation : isoldContestStoredV2 ? oldContestStored.objectives[(index+index2)].activated : oldContestStored[(index+index2)].activated ,
                    })
                })
                donationcount = 2; // not 3 due to index increasing
            }
            else{
                objectivesData.push({
                    action: objective.name,
                    pointsPerAction: objective[currActiveContest.objective_key+"_points"] || 1, // you seriously putting null when it's 1
                    activated: oldContestStored === undefined ? defaultActivation : isoldContestStoredV2 ? oldContestStored.objectives[(index+donationcount)].activated : oldContestStored[(index+donationcount)].activated ,
                })
            }
        })
        const contestStored = {
            version : currentContestStoredVersion,
            objectives : objectivesData
        }
        GM_setValue(currentconteststoragekey, contestStored);
        return;
    }
    function getDescriptionFrom$objectivediv($objectivediv) {
        const basicdesctext = $objectivediv.find(".obj_desc").text().trim();
        if ($objectivediv.hasClass("donate")) {
            const $donatebtn = $objectivediv.find(
                '[type="button"].green_button_L[data-price]'
            );
            const donatebtntext = $donatebtn.text().trim();
            return basicdesctext + " " + donatebtntext;
        }
        return basicdesctext;
    }
    function parseFormattedNumber(str) {
        // Handle empty/null/undefined
        if (!str) return 0;

        // Normalize the string: remove commas, trim whitespace, and convert to lowercase
        const cleanStr = str.replace(/,/g, "").trim().toLowerCase();
        const nb = str.replace(/\D/g, '')

        // Check if the string ends with 'k'
        if (cleanStr.endsWith("k")) {
            // Convert to float and multiply by 1000
            const numberValue = parseFloat(nb) || 0;
            return Math.round(numberValue * 1000);
        }

        // Handle regular numbers
        return parseInt(nb, 10) || 0;
    }
    function formatNumberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function modifyTbdoyForCustomCSS() {
        const $tbody = $("tbody.leadTable");
        if (!$tbody.hasClass("custombettercontests")) {
            $tbody.addClass("custombettercontests");
        }
    }


    function lockRewards(){
        if(lockedRewardsStyle){return;}
        lockedRewardsStyle = GM_addStyle("#contests > div.contests-container > div.left_part > .scroll_area > .contest > .contest_header > .personal_rewards > button{display:none}") //same css as the game uses
        const $endecontests = $(".contest > .ended")
        $endecontests.each(function(){
            const $this = $(this)
            const $unlockbtn = $(`<button class="CPPlock-claim-rewards">Unlock Rewards</button>`)
            $unlockbtn.on("click.unlockRewards",function(e){
                e.stopPropagation();
                unLockRewards()
            })
            $this.append($unlockbtn)
        })
    }
    function unLockRewards(){
        $(".CPPlock-claim-rewards").remove()
        if(lockedRewardsStyle){
            lockedRewardsStyle.remove()
            lockedRewardsStyle=null
        }
    }

    function isSelectedContest() {
        return (
            $(".contest_header_active > .contest_title_timer >.contest_title")
            .length != 0
        );
    }

    //inject custom style
    const tighterContestStyle = `
/* ====== outside of the tbody ====== */
#contests > div.contests-container > div.right_part > .ranking table {
    margin-left: 5px;
}

#contests > div.contests-container > div.left_part, #contests > div.contests-container > div.right_part {/* gain places on the height */
margin-top: 3rem!important;
}
#contests > div.contests-container > div {
    height: 28.75rem!important;
}
#contests > div.contests-container > div.left_part > .scroll_area {
    height: 27.5rem!important;
    margin-right: 0.3rem!important;
}
#contests > div.contests-container > div.left_part {
    padding-top: 5px!important;
}
#contests > div.contests-container > div.left_part > .scroll_area > .contest > .contest_body > .contest_rewards > .reward_position {
    height: 2.9rem!important;
    padding-top: 3px!important;
    transition: all 0s!important;
}
#contests > div.contests-container > div.left_part > .scroll_area {
    height: 27.5rem!important;
    margin-right: 0.3rem!important;
}
#contests > div.contests-container > div.right_part > .ranking > h5 { /* removes some spaces from top & bottom of the contest titles */
    margin-top: 0.5rem!important;
    margin-bottom: 0.5rem!important;
}
#contests > div.contests-container > div.right_part > .ranking .lead_table_view.hh-scroll { /* follows so more spaces to see the contests rankings */
    height: 420px!important;
}
#contests > div.contests-container > div.right_part > .ranking.ended .lead_table_view.hh-scroll { /* follows so more spaces to see the contests rankings */
    height: 385px!important;
}
#contests > div.contests-container > div.right_part > .ranking.ended > .closed {
    margin-bottom: 5px!important;
}
#contests > div.contests-container > div.left_part > .scroll_area > .contest > .contest_body > .contest_info > .flavor_text { /* removes the flavor text */
    display: none!important;
}
    `
    const essentialStyle=`

/* ====== diamond ====== */
.CPPdiamond.locked {
    cursor: pointer;
    border: 2px solid #ffffff;
    background-color: #858585;
    opacity: 0.5;
    -webkit-box-shadow: 0px 0px 0px #000;
    -moz-box-shadow: 0px 0px 0px #000;
    box-shadow: 0px 0px 0px #000;
}
.CPPdiamond.unlocked {
    cursor: pointer;
    border: 2px solid #ffffff;
    background-color: #1f2958;
}
.CPPdiamond {
    -webkit-transform: rotate(45deg);
    -moz-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    -o-transform: rotate(45deg);
    transform: rotate(45deg);
    width: 14px;
    min-width:14px;
    max-width:14px;
    height: 14px;
    min-height: 14px;
    max-height:14px;
    margin-right: 8px;
}

/* ====== Settings Button ====== */
.CPPsettings-btn {
    background: #702436;
    border: 1px solid #702436;
    color: #fff;
    padding: 2px 8px;
    font-size: 10px;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 10px;
    transition: background 0.2s ease;
    display: inline-block;
}

.CPPsettings-btn:hover {
    background: #983455;
    border-color: #983455;
}

/* ====== Settings Popup ====== */
.CPPsettings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.CPPsettings-popup {
    background: rgb(48, 9, 18);
    border: 2px solid #702436;
    border-radius: 8px;
    padding: 20px;
    color: #fff;
    font-size: 14px;
    min-width: 400px;
    height: 470px;
    overflow: auto;
    padding: 10px 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.CPPsettings-header {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 5px 10px;
    text-align: center;
    color: #fff;
    border-bottom: 2px solid #702436;
}

.CPPsettings-section {
    margin-bottom: 5px;
    font: inherit;
}

.CPPsettings-section h3 {
    color: #fff;
    margin-bottom: 10px;
    font-size: 16px;
    border-left: 3px solid #702436;
    padding-left: 10px;
}

.CPPsettings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid transparent;
}

.CPPsettings-row:hover {
    border-color: #702436;
}

.CPPsettings-label {
    flex: 1;
    color: #fff;
}

.CPPsettings-control {
    flex: 0 0 auto;
}

.CPPcheckbox {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #702436;
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
    position: relative;
}

.CPPcheckbox:checked {
    background: #702436;
}

.CPPcheckbox:checked::after {
    content: '✓';
    position: absolute;
    top: -2px;
    left: 2px;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
}

.CPPcolor-input {
    width: 40px;
    height: 25px;
    border: 2px solid #702436;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    padding: 0;
}

.CPPbuttons {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #702436;
}

.CPPbtn {
    padding: 8px 16px;
    border: 2px solid #702436;
    border-radius: 4px;
    background: transparent;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
}

.CPPbtn:hover {
    background: #702436;
}

.CPPbtn.primary {
    background: #702436;
}

.CPPbtn.primary:hover {
    background: #983455;
    border-color: #983455;
}

.CPPlock-claim-rewards{
    position: absolute;
    background-image: linear-gradient(to top, #e3005b 0%, #820040 100%);
    top: 36px;
    left: 8px;
    border-radius: 7px;
    border: 1px solid #000000;
    cursor: pointer;
    font-size: 13px;
}

`;
    const customStyleTbodyInner = `
#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(1){
    width: 25px;
    text-align: left;
    padding-right : 0px;
}
#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(2) {
    width: 180px;
    max-width: 180px;
    overflow: hidden;
}
#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(3) {
    width: 89px;
    text-align: center;
    padding-bottom: 6px;
    padding-right: 8px;
    border-radius: 0px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
    border-right: none;
}

#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(3) > div {
    display:none;
    background: none;
    width:0px;
    height:0px;
}
#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(4) > div {
    width: 20px;
    height: 20px;
    background: no-repeat url(/images/design/ic_cp.png);
    background-size: 20px 20px;
    background-position: center center;
    float: right;
}
#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr:hover td:nth-child(4) {
    border-color: #983455!important;
}

#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr td:nth-child(4) {
    width: 112px;
    text-align: right;
    padding-bottom: 6px;
    padding-right: 15px;
    border: 2px solid transparent;
    border-radius: 8px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
}

#contests > div.contests-container > div.right_part > .ranking table tbody.leadTable.custombettercontests tr.lead_table_default td:nth-child(4) {
    border-color: #347098;
}

.CPPplayername{
    display: inline-block; /* Key change to apply max-width */
    max-width: 145px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
`;
    function injectContestsPlusPlusColor() {
        if(positiveNegativeStyle){positiveNegativeStyle.remove();positiveNegativeStyle=null} // remove old style if exists
        const contestselementcolor = `
    .contestspluspluspositive{
    color : ${GM_getValue(COLOR_POSITIVE_KEY, "#23b56b")};
    }
    .contestsplusplusnegative{
    color : ${GM_getValue(COLOR_NEGATIVE_KEY, "#ec0039")};
    }
    `;
        positiveNegativeStyle = GM_addStyle(contestselementcolor);
    }

    function createSettingsPopup() {
        // Configuration for all settings
        const settingsConfig = [
            {
                section: "Objectives Columns",
                settings: [
                    {
                        key: FIRST_SHOWN_KEY,
                        title: "Show 1st Place",
                        type: "checkbox",
                        default: true,
                        callback: (value) => {
                            GM_setValue(FIRST_SHOWN_KEY, value);
                            refreshObjectivesTable();
                        }
                    },
                    {
                        key: TOP4_SHOWN_KEY,
                        title: "Show Top 4",
                        type: "checkbox",
                        default: true,
                        callback: (value) => {
                            GM_setValue(TOP4_SHOWN_KEY, value);
                            refreshObjectivesTable();
                        }
                    },
                    {
                        key: TOP10_SHOWN_KEY,
                        title: "Show Top 10/15",
                        type: "checkbox",
                        default: false,
                        callback: (value) => {
                            GM_setValue(TOP10_SHOWN_KEY, value);
                            refreshObjectivesTable();
                        }
                    },
                    {
                        key: TOP25_SHOWN_KEY,
                        title: "Show Top 25/30",
                        type: "checkbox",
                        default: false,
                        callback: (value) => {
                            GM_setValue(TOP25_SHOWN_KEY, value);
                            refreshObjectivesTable();
                        }
                    }
                ]
            },
            {
                section: "Colors",
                settings: [
                    {
                        key: COLOR_POSITIVE_KEY,
                        title: "Positive Color",
                        type: "color",
                        default: "#23b56b",
                        callback: (value) => {
                            GM_setValue(COLOR_POSITIVE_KEY, value);
                            injectContestsPlusPlusColor();
                        }
                    },
                    {
                        key: COLOR_NEGATIVE_KEY,
                        title: "Negative Color",
                        type: "color",
                        default: "#ec0039",
                        callback: (value) => {
                            GM_setValue(COLOR_NEGATIVE_KEY, value);
                            injectContestsPlusPlusColor();
                        }
                    }
                ]
            },
            {
                section: "Tiebreaker Settings",
                settings: [
                    {
                        key: TIEBREAKER_KEY,
                        title: "Enable Tiebreaker",
                        type: "checkbox",
                        default: true,
                        callback: (value) => {
                            GM_setValue(TIEBREAKER_KEY, value);
                        }
                    },
                    {
                        key: TIEBREAKER_INVERTED_KEY,
                        title: "Inverted Tiebreaker",
                        type: "checkbox",
                        default: false,
                        callback: (value) => {
                            GM_setValue(TIEBREAKER_INVERTED_KEY, value);
                        }
                    }
                ]
            },
            {
                section : "Misc",
                settings : [
                    {
                        key: CLAIM_REWARDS_LOCK_KEY,
                        title: "Claim Rewards 2step",
                        type : "checkbox",
                        default: false,
                        callback: (value) =>{
                            GM_setValue(CLAIM_REWARDS_LOCK_KEY, value);
                            if(value) {
                                lockRewards();
                            } else {
                                unLockRewards();
                            }
                        }
                    },
                    {
                        key: TIGHTER_CONTEST_VIEW_KEY,
                        title: "Tighter Contest View",
                        type: "checkbox",
                        default: true,
                        callback: (value) => {
                            GM_setValue(TIGHTER_CONTEST_VIEW_KEY, value);
                            if (value ) {
                                if(!tighterContestViewStyle){
                                    tighterContestViewStyle = GM_addStyle(tighterContestStyle);
                                }
                            } else {
                                if(tighterContestViewStyle){
                                    tighterContestViewStyle.remove();
                                    tighterContestViewStyle = null
                                }
                            }
                        }
                    }
                ]

            }
        ];

        // Helper function to refresh the objectives table
        function refreshObjectivesTable() {
            const currentTable = $('.BC-custom-objectives-table');
            if (currentTable.length) {
                currentTable.remove();
                generateCustomObjectives(
                    currplayerindexGlobal,
                    playersinformationGlobal,
                    currentconteststoragekeyGlobal,
                    getCurrActiveContest()
                );
            }
        }

        // Generate HTML from configuration
        let sectionsHTML = '';
        settingsConfig.forEach(section => {
            sectionsHTML += `
            <div class="CPPsettings-section">
                <h3>${section.section}</h3>`;

            section.settings.forEach(setting => {
                const currentValue = GM_getValue(setting.key, setting.default);
                const inputHTML = setting.type === 'checkbox'
                ? `<input type="checkbox" class="CPPcheckbox" data-key="${setting.key}" ${currentValue ? 'checked' : ''}>`
                : `<input type="color" class="CPPcolor-input" data-key="${setting.key}" value="${currentValue}">`;

                sectionsHTML += `
                <div class="CPPsettings-row">
                    <div class="CPPsettings-label">${setting.title}</div>
                    <div class="CPPsettings-control">
                        ${inputHTML}
                    </div>
                </div>`;
            });

            sectionsHTML += `</div>`;
        });

        const $overlay = $(`
        <div class="CPPsettings-overlay">
            <div class="CPPsettings-popup hh-scroll">
                <div class="CPPsettings-header">Contests++ Settings</div>
                ${sectionsHTML}
                <div class="CPPbuttons">
                    <button class="CPPbtn" id="CPP-close">Close</button>
                    <button class="CPPbtn" id="CPP-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `);

        // Helper function to get setting config by key
        function getSettingConfig(key) {
            for (const section of settingsConfig) {
                const setting = section.settings.find(s => s.key === key);
                if (setting) return setting;
            }
            return null;
        }

        // Add event handlers for immediate changes
        $overlay.find('input[type="checkbox"]').on('change', function() {
            // Handle checkbox changes
            const $input = $(this);
            const key = $input.data('key');
            const config = getSettingConfig(key);

            if (config && config.callback) {
                config.callback($input.prop('checked'));
            }
        });

        $overlay.find('input[type="color"]').on('change input', function() {
            // Handle color changes
            const $input = $(this);
            const key = $input.data('key');
            const config = getSettingConfig(key);

            if (config && config.callback) {
                config.callback($input.val());
            }
        });

        // Add event handlers for buttons
        $overlay.find('#CPP-close').on('click', () => {
            $overlay.remove();
        });

        $overlay.find('#CPP-reset').on('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                // Reset all settings to defaults and trigger callbacks
                settingsConfig.forEach(section => {
                    section.settings.forEach(setting => {
                        if (setting.callback) {
                            setting.callback(setting.default);
                        }
                    });
                });
                $overlay.remove();
            }
        });

        // Close on overlay click
        $overlay.on('click', (e) => {
            if (e.target === $overlay[0]) {
                $overlay.remove();
            }
        });

        // Prevent popup close on popup click
        $overlay.find('.CPPsettings-popup').on('click', (e) => {
            e.stopPropagation();
        });

        $('#contains_all').append($overlay);
    }
function setup() {
    run1TimeAtScriptStart();
    if (location.search.includes("?tab=contests")) {
        if(isSelectedContest()){
            run1TimeInContestTab();
        }
        else{
            const observer = new MutationObserver(() => {
                if (isSelectedContest()) {
                    observer.disconnect();
                    run1TimeInContestTab();
                }
            });
            observer.observe(document,{
                childList: true,
                subtree: true,
            })
        }
    }
    else{
        const contestswitcher = $("[data-tab='contests']");
        contestswitcher.on("click.switchtabcontest", () => {
            // hooks the contests tab
            const observer = new MutationObserver(() => {
                if (isSelectedContest()) {
                    observer.disconnect();
                    run1TimeInContestTab();
                    changeSwitchTabScroll();
                }
            });
            observer.observe(document.querySelector("#contests"), {
                childList: true,
                subtree: true,
            });
            if (isSelectedContest()) {
                observer.disconnect();
                run1TimeInContestTab();
                changeSwitchTabScroll();
            }
        });
    }
}

setup();
})();
