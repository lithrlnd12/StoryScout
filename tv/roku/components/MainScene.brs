sub init()
    m.top.setFocus(true)

    ' Get UI elements
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.genreRow = m.top.findNode("genreRow")
    m.genreRowBg = m.top.findNode("genreRowBg")
    m.genreLabel = m.top.findNode("genreLabel")
    m.titleLabel = m.top.findNode("titleLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.statusLabel = m.top.findNode("statusLabel")
    m.bottomCard = m.top.findNode("bottomCard")
    m.navHint = m.top.findNode("navHint")

    ' Watch Party UI elements
    m.watchPartyOverlay = m.top.findNode("watchPartyOverlay")
    m.watchPartyLoading = m.top.findNode("watchPartyLoading")
    m.watchPartyLobby = m.top.findNode("watchPartyLobby")
    m.loadingText = m.top.findNode("loadingText")
    m.lobbyCode = m.top.findNode("lobbyCode")
    m.lobbyContentTitle = m.top.findNode("lobbyContentTitle")
    m.lobbyParticipantsTitle = m.top.findNode("lobbyParticipantsTitle")
    m.lobbyParticipants = m.top.findNode("lobbyParticipants")
    m.lobbyStatus = m.top.findNode("lobbyStatus")
    m.lobbyInstructions = m.top.findNode("lobbyInstructions")
    m.createBg = m.top.findNode("createBg")
    m.joinBg = m.top.findNode("joinBg")
    m.cancelBg = m.top.findNode("cancelBg")

    ' Initialize state
    m.currentIndex = 0
    m.isMuted = true
    m.contentData = []
    m.allGenres = []
    m.selectedGenreIndex = 0
    m.filteredContent = []
    m.genrePills = []
    m.isFullScreen = false
    m.isUIVisible = true

    ' Watch Party state
    m.watchPartyActive = false
    m.isPartyHost = false
    m.partyCode = ""
    m.showWatchPartyMenu = false
    m.showJoinKeyboard = false
    m.joinCodeInput = ""
    m.keyboardCursorPos = 0
    m.watchPartyMenuSelection = 0
    m.partyStatus = "idle"  ' idle, lobby, playing
    m.participantCount = 0

    ' Firebase Cloud Functions base URL
    m.apiBaseUrl = "https://us-central1-story-scout.cloudfunctions.net"

    ' Message port for async HTTP requests
    m.port = createObject("roMessagePort")

    ' Polling timer for party sync
    m.syncTimer = invalid
    m.lobbyTimer = invalid

    ' Observe content data
    m.top.observeField("contentData", "onContentDataChanged")
end sub

sub onContentDataChanged()
    m.contentData = m.top.contentData

    if m.contentData <> invalid and m.contentData.count() > 0
        m.statusLabel.text = "Loaded " + m.contentData.count().toStr() + " films"

        ' Extract unique genres
        buildGenreList()

        ' Build genre pills UI
        buildGenrePills()

        ' Filter content by selected genre
        filterContentByGenre()

        ' Load first video after short delay
        m.timer = createObject("roSGNode", "Timer")
        m.timer.duration = 0.5
        m.timer.repeat = false
        m.timer.observeField("fire", "loadCurrentVideo")
        m.timer.control = "start"
    else
        m.statusLabel.text = "No content available"
    end if
end sub

sub buildGenreList()
    ' Extract unique genres from content
    genreSet = {}
    genreSet["All"] = true

    for each item in m.contentData
        if item.genre <> invalid and item.genre <> ""
            genreSet[item.genre] = true
        end if
    end for

    ' Convert to array
    m.allGenres = ["All"]
    for each genre in genreSet
        if genre <> "All"
            m.allGenres.push(genre)
        end if
    end for
end sub

sub buildGenrePills()
    ' Clear existing pills
    m.genreRow.removeChildren(m.genreRow.getChildren(-1, 0))
    m.genrePills = []

    ' Create pill for each genre (safe zone compliant, properly sized)
    for i = 0 to m.allGenres.count() - 1
        genre = m.allGenres[i]
        isSelected = (i = m.selectedGenreIndex)

        ' Create pill group
        pill = createObject("roSGNode", "Group")
        pill.visible = true

        ' Pill background (larger for 10-foot viewing)
        pillBg = createObject("roSGNode", "Rectangle")
        pillBg.width = 160
        pillBg.height = 50
        pillBg.visible = true

        if isSelected then
            pillBg.color = "#E91E63"
            pillBg.opacity = 1.0
        else
            pillBg.color = "#1F2937"
            pillBg.opacity = 0.8
        end if

        pill.appendChild(pillBg)

        ' Pill text (properly centered using width and horizAlign)
        pillText = createObject("roSGNode", "Label")
        pillText.text = genre
        pillText.translation = [0, 14]
        pillText.width = 160
        pillText.horizAlign = "center"
        pillText.font = "font:MediumBoldSystemFont"
        pillText.visible = true

        if isSelected then
            pillText.color = "#FFFFFF"
        else
            pillText.color = "#D1D5DB"
        end if

        pill.appendChild(pillText)

        m.genreRow.appendChild(pill)
        m.genrePills.push(pill)
    end for
end sub

sub filterContentByGenre()
    selectedGenre = m.allGenres[m.selectedGenreIndex]

    if selectedGenre = "All"
        m.filteredContent = m.contentData
    else
        m.filteredContent = []
        for each item in m.contentData
            if item.genre = selectedGenre
                m.filteredContent.push(item)
            end if
        end for
    end if

    ' Reset to first video when changing genre
    m.currentIndex = 0
end sub

sub updateGenrePills()
    ' Update pill colors and text based on selection
    for i = 0 to m.genrePills.count() - 1
        pill = m.genrePills[i]
        pillBg = pill.getChild(0)
        pillText = pill.getChild(1)

        if i = m.selectedGenreIndex then
            pillBg.color = "#E91E63"
            pillBg.opacity = 1.0
            pillText.color = "#FFFFFF"
        else
            pillBg.color = "#1F2937"
            pillBg.opacity = 0.8
            pillText.color = "#D1D5DB"
        end if
    end for
end sub

sub loadCurrentVideo()
    if m.filteredContent.count() = 0 then return

    ' Wrap around
    if m.currentIndex >= m.filteredContent.count()
        m.currentIndex = 0
    else if m.currentIndex < 0
        m.currentIndex = m.filteredContent.count() - 1
    end if

    item = m.filteredContent[m.currentIndex]

    ' Update UI
    m.genreLabel.text = item.genre
    m.titleLabel.text = item.title

    ' Truncate synopsis (shorter for compact layout)
    synopsis = item.synopsis
    if synopsis.len() > 120 then
        synopsis = synopsis.left(120) + "..."
    end if
    m.synopsisLabel.text = synopsis

    ' Load video
    videoContent = createObject("roSGNode", "ContentNode")
    videoContent.url = item.trailerVideoId
    videoContent.streamFormat = "mp4"

    m.videoPlayer.content = videoContent
    m.videoPlayer.muted = m.isMuted
    m.videoPlayer.control = "play"
    m.videoPlayer.visible = true

    ' Hide loading status
    m.statusLabel.visible = false

    ' Show bottom card with details
    m.bottomCard.visible = true

    m.videoPlayer.observeField("state", "onVideoState")
end sub

sub onVideoState()
    state = m.videoPlayer.state
    if state = "error"
        m.statusLabel.text = "Video Error"
        m.statusLabel.visible = true
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    ' Debug: print all key presses to help identify the asterisk key
    print "Key pressed: " + key

    ' Watch Party Lobby is open - handle lobby navigation
    if m.watchPartyLobby.visible then
        if key = "back" then
            ' Close lobby and cancel watch party
            closeLobby()
            return true
        else if key = "OK" and m.isPartyHost then
            ' Start playback
            startPlayback()
            return true
        end if
        return true  ' Consume all keys when lobby is open
    end if

    ' Watch Party Menu is open - handle menu navigation
    if m.showWatchPartyMenu then
        handleWatchPartyMenuNav(key)
        return true
    end if

    ' Full-screen mode behavior
    if m.isFullScreen then
        if key = "OK" then
            ' Exit full-screen mode
            exitFullScreen()
            return true
        else if key = "down" or key = "up" then
            ' Toggle UI visibility
            toggleUIVisibility()
            return true
        else if key = "back" then
            ' Exit full-screen mode
            exitFullScreen()
            return true
        else if key = "play" then
            m.videoPlayer.control = "resume"
            return true
        else if key = "pause" then
            m.videoPlayer.control = "pause"
            return true
        else if key = "fastforward" then
            m.videoPlayer.seek = m.videoPlayer.position + 10
            return true
        else if key = "rewind" then
            m.videoPlayer.seek = m.videoPlayer.position - 10
            return true
        end if
        return false
    end if

    ' Feed mode behavior (UI visible)
    if key = "down" then
        ' Next video
        m.currentIndex = m.currentIndex + 1
        loadCurrentVideo()
        return true
    else if key = "up" then
        ' Previous video
        m.currentIndex = m.currentIndex - 1
        loadCurrentVideo()
        return true
    else if key = "left" then
        ' Previous genre
        m.selectedGenreIndex = m.selectedGenreIndex - 1
        if m.selectedGenreIndex < 0 then
            m.selectedGenreIndex = m.allGenres.count() - 1
        end if
        updateGenrePills()
        filterContentByGenre()
        loadCurrentVideo()
        return true
    else if key = "right" then
        ' Next genre
        m.selectedGenreIndex = m.selectedGenreIndex + 1
        if m.selectedGenreIndex >= m.allGenres.count() then
            m.selectedGenreIndex = 0
        end if
        updateGenrePills()
        filterContentByGenre()
        loadCurrentVideo()
        return true
    else if key = "options" or key = "*" or key = "replay" then
        ' Open watch party menu (asterisk key can be "options", "*", or "replay" on different remotes)
        openWatchPartyMenu()
        return true
    else if key = "OK" then
        ' If in lobby as host, start playback
        if m.partyStatus = "lobby" and m.isPartyHost then
            startPlayback()
            return true
        end if
        ' Enter full-screen mode
        enterFullScreen()
        return true
    else if key = "back" then
        return true
    end if

    return false
end function

sub enterFullScreen()
    if m.filteredContent.count() = 0 then return

    m.isFullScreen = true
    m.isUIVisible = false

    ' Hide all UI elements
    hideAllUI()

    ' Configure video for full-screen playback
    m.videoPlayer.loop = false
    m.videoPlayer.muted = false
    m.videoPlayer.enableUI = true
    m.videoPlayer.control = "play"
end sub

sub exitFullScreen()
    m.isFullScreen = false
    m.isUIVisible = true

    ' Show all UI elements
    showAllUI()

    ' Configure video for feed mode
    m.videoPlayer.loop = true
    m.videoPlayer.muted = m.isMuted
    m.videoPlayer.enableUI = false
    m.videoPlayer.control = "play"
end sub

sub toggleUIVisibility()
    m.isUIVisible = not m.isUIVisible

    if m.isUIVisible then
        showAllUI()
    else
        hideAllUI()
    end if
end sub

sub hideAllUI()
    m.genreRowBg.visible = false
    m.genreRow.visible = false
    m.bottomCard.visible = false
    m.navHint.visible = false
end sub

sub showAllUI()
    m.genreRowBg.visible = true
    m.genreRow.visible = true
    m.bottomCard.visible = true
    m.navHint.visible = true
end sub

sub openStarRating()
    ' Disabled - asterisk key now opens watch party menu
    return
end sub

sub hideRatingMessage()
    m.statusLabel.visible = false
end sub

sub hideJoinMessage()
    m.statusLabel.visible = false
end sub

' ============================================================================
' WATCH PARTY FUNCTIONS
' ============================================================================

sub openWatchPartyMenu()
    m.showWatchPartyMenu = true
    m.watchPartyMenuSelection = 0
    m.watchPartyOverlay.visible = true
    updateWatchPartyMenuSelection()
end sub

sub closeWatchPartyMenu()
    m.showWatchPartyMenu = false
    m.watchPartyOverlay.visible = false
end sub

sub updateWatchPartyMenuSelection()
    ' Reset all to unselected state
    m.createBg.color = "#374151"
    m.joinBg.color = "#374151"
    m.cancelBg.color = "#374151"

    ' Highlight selected option
    if m.watchPartyMenuSelection = 0 then
        m.createBg.color = "#E91E63"
    else if m.watchPartyMenuSelection = 1 then
        m.joinBg.color = "#E91E63"
    else if m.watchPartyMenuSelection = 2 then
        m.cancelBg.color = "#E91E63"
    end if
end sub

sub handleWatchPartyMenuNav(key as String)
    if key = "up" then
        m.watchPartyMenuSelection = m.watchPartyMenuSelection - 1
        if m.watchPartyMenuSelection < 0 then
            m.watchPartyMenuSelection = 2
        end if
        updateWatchPartyMenuSelection()
    else if key = "down" then
        m.watchPartyMenuSelection = m.watchPartyMenuSelection + 1
        if m.watchPartyMenuSelection > 2 then
            m.watchPartyMenuSelection = 0
        end if
        updateWatchPartyMenuSelection()
    else if key = "OK" then
        if m.watchPartyMenuSelection = 0 then
            ' Create Party
            closeWatchPartyMenu()
            createWatchParty()
        else if m.watchPartyMenuSelection = 1 then
            ' Join Party - Temporarily disabled
            closeWatchPartyMenu()
            m.statusLabel.text = "Join Party coming soon! Use web/mobile to join for now."
            m.statusLabel.visible = true
            ' Auto-hide after 4 seconds
            m.joinDisabledTimer = createObject("roSGNode", "Timer")
            m.joinDisabledTimer.duration = 4
            m.joinDisabledTimer.repeat = false
            m.joinDisabledTimer.observeField("fire", "hideJoinMessage")
            m.joinDisabledTimer.control = "start"
        else if m.watchPartyMenuSelection = 2 then
            ' Cancel
            closeWatchPartyMenu()
        end if
    else if key = "back" then
        closeWatchPartyMenu()
    end if
end sub

sub createWatchParty()
    if m.filteredContent.count() = 0 then return

    ' Show loading overlay
    m.loadingText.text = "Creating Watch Party..."
    m.watchPartyLoading.visible = true

    ' Get current content item
    item = m.filteredContent[m.currentIndex]

    ' Generate unique user ID for Roku
    deviceInfo = createObject("roDeviceInfo")
    userId = "roku_" + deviceInfo.GetChannelClientId()

    ' Create Task node for background HTTP operation
    m.createTask = createObject("roSGNode", "WatchPartyTask")

    ' Observe result and error fields FIRST (before setting inputs or starting)
    m.createTask.observeField("result", "onCreatePartyResult")
    m.createTask.observeField("error", "onCreatePartyError")

    ' Now set input fields
    m.createTask.operation = "create"
    m.createTask.userId = userId
    m.createTask.displayName = "Roku User"
    m.createTask.contentId = item.id
    m.createTask.contentTitle = item.title
    m.createTask.videoUrl = item.fullContentVideoId

    ' Start the task (runs on background thread)
    m.createTask.control = "RUN"

    print "Watch party create task started"
end sub

sub onCreatePartyResult()
    result = m.createTask.result
    print "onCreatePartyResult called, result = "; result

    ' Hide loading overlay
    m.watchPartyLoading.visible = false

    if result <> invalid and result.success = true
        m.partyCode = result.code
        print "Party code from result: "; m.partyCode
        m.isPartyHost = true
        m.watchPartyActive = true
        m.partyStatus = "lobby"
        m.participantCount = 1

        ' Get current content
        item = m.filteredContent[m.currentIndex]

        ' Show lobby modal
        print "Setting lobbyCode.text to: "; m.partyCode
        print "lobbyCode node is: "; m.lobbyCode
        print "lobbyCode current text before setting: "; m.lobbyCode.text
        m.lobbyCode.text = m.partyCode
        print "lobbyCode text after setting: "; m.lobbyCode.text
        m.lobbyContentTitle.text = item.title
        m.lobbyParticipantsTitle.text = "Watching (1/10)"
        m.lobbyParticipants.text = "• Roku User (Host)"
        m.lobbyStatus.text = "⏱️ In Lobby"
        m.lobbyInstructions.text = "Press OK to start watch party"
        print "Making lobby visible"
        m.watchPartyLobby.visible = true

        print "Created watch party with code: " + m.partyCode

        ' Start polling lobby for new participants
        startLobbyPolling()
    else
        print "Create party failed or result invalid"
        m.statusLabel.text = "Failed to create party"
        m.statusLabel.visible = true
    end if
end sub

sub onCreatePartyError()
    error = m.createTask.error

    ' Hide loading overlay
    m.watchPartyLoading.visible = false

    m.statusLabel.text = "Error: " + error
    m.statusLabel.visible = true
    print "Create party error: " + error
end sub


sub joinWatchParty(code as String)
    ' Show joining message
    m.statusLabel.text = "Joining party..."
    m.statusLabel.visible = true

    ' Generate unique user ID for Roku (using device ID)
    deviceInfo = createObject("roDeviceInfo")
    userId = "roku_" + deviceInfo.GetChannelClientId()

    ' Create Task node for background HTTP operation
    m.joinTask = createObject("roSGNode", "WatchPartyTask")
    m.joinTask.observeField("result", "onJoinPartyResult")
    m.joinTask.observeField("error", "onJoinPartyError")
    m.joinTask.operation = "join"
    m.joinTask.joinCode = code
    m.joinTask.userId = userId
    m.joinTask.displayName = "Roku User"
    m.joinTask.control = "RUN"

    print "Watch party join request sent for code: " + code
end sub

sub onJoinPartyResult()
    result = m.joinTask.result

    if result <> invalid and result.success = true and result.party <> invalid
        m.partyCode = result.party.code
        m.isPartyHost = false
        m.watchPartyActive = true

        ' Check party status
        if result.party.status = "waiting" then
            m.partyStatus = "lobby"
            participantCount = result.party.participants.count()
            m.participantCount = participantCount
            m.statusLabel.text = "In lobby | " + participantCount.toStr() + " people | Waiting for host..."
            m.statusLabel.visible = true
            ' Start polling for party state changes
            startLobbyPolling()
        else if result.party.status = "playing" then
            ' Party already started, join in progress
            m.partyStatus = "playing"
            m.statusLabel.text = "Joined party: " + m.partyCode + " | Syncing..."
            m.statusLabel.visible = true
            startPlaybackSync()
        end if

        print "Joined watch party: " + m.partyCode
    else
        m.statusLabel.text = "Party not found"
        m.statusLabel.visible = true
    end if
end sub

sub onJoinPartyError()
    error = m.joinTask.error
    m.statusLabel.text = "Error: " + error
    m.statusLabel.visible = true
    print "Join party error: " + error
end sub

' ============================================================================
' LOBBY AND SYNC FUNCTIONS
' ============================================================================

sub closeLobby()
    ' Close the lobby modal
    m.watchPartyLobby.visible = false

    ' Stop lobby polling
    if m.lobbyTimer <> invalid
        m.lobbyTimer.control = "stop"
        m.lobbyTimer = invalid
    end if

    ' Reset watch party state
    m.watchPartyActive = false
    m.isPartyHost = false
    m.partyCode = ""
    m.partyStatus = "idle"
    m.participantCount = 0

    print "Closed lobby"
end sub

sub startLobbyPolling()
    ' Poll every 2 seconds for lobby updates
    m.lobbyTimer = createObject("roSGNode", "Timer")
    m.lobbyTimer.duration = 2
    m.lobbyTimer.repeat = true
    m.lobbyTimer.observeField("fire", "pollLobbyState")
    m.lobbyTimer.control = "start"

    print "Started lobby polling"
end sub

sub pollLobbyState()
    ' Create Task node for background HTTP operation
    m.pollTask = createObject("roSGNode", "WatchPartyTask")
    m.pollTask.operation = "get"
    m.pollTask.partyCode = m.partyCode

    ' Observe result
    m.pollTask.observeField("result", "onPollResult")

    ' Start the task (runs on background thread)
    m.pollTask.control = "RUN"
end sub

sub onPollResult()
    result = m.pollTask.result

    if result <> invalid and result.success = true and result.party <> invalid
        party = result.party

        ' Update participant count and list
        if party.participants <> invalid
            participantCount = party.participants.count()
            if participantCount <> m.participantCount
                m.participantCount = participantCount

                ' Update lobby UI
                m.lobbyParticipantsTitle.text = "Watching (" + participantCount.toStr() + "/10)"

                ' Build participant list
                participantList = ""
                for i = 0 to party.participants.count() - 1
                    participant = party.participants[i]
                    icon = "•"
                    if participant.platform = "mobile" then icon = "📱"
                    if participant.platform = "web" then icon = "💻"
                    if participant.platform = "roku" then icon = "📺"

                    line = icon + " " + participant.displayName
                    if participant.userId = party.hostUserId then line = line + " (Host)"
                    if i < party.participants.count() - 1 then line = line + Chr(10)
                    participantList = participantList + line
                end for
                m.lobbyParticipants.text = participantList
            end if
        end if

        ' Check if party started
        if party.status = "playing" and m.partyStatus = "lobby"
            m.partyStatus = "playing"
            m.lobbyTimer.control = "stop"
            m.watchPartyLobby.visible = false
            ' Start synchronized playback
            startPlaybackSync()
        end if
    end if
end sub

sub startPlayback()
    ' Host starts the party - update Firebase
    if not m.isPartyHost then return
    if m.partyStatus <> "lobby" then return

    m.partyStatus = "playing"
    m.statusLabel.text = "Starting party..."
    m.statusLabel.visible = true

    ' Stop lobby polling
    if m.lobbyTimer <> invalid
        m.lobbyTimer.control = "stop"
    end if

    ' Close lobby modal
    m.watchPartyLobby.visible = false

    ' Update party status to playing using Task
    m.startTask = createObject("roSGNode", "WatchPartyTask")
    m.startTask.operation = "update"
    m.startTask.partyCode = m.partyCode
    m.startTask.status = "playing"
    m.startTask.currentTime = 0
    m.startTask.control = "RUN"

    print "Party playback started"
    ' Start sync loop
    startPlaybackSync()
end sub

sub startPlaybackSync()
    ' Start polling for playback sync every 3 seconds
    m.syncTimer = createObject("roSGNode", "Timer")
    m.syncTimer.duration = 3
    m.syncTimer.repeat = true
    m.syncTimer.observeField("fire", "syncPlayback")
    m.syncTimer.control = "start"

    ' Hide status label
    m.statusLabel.visible = false

    print "Started playback sync"
end sub

sub syncPlayback()
    ' Get current party state using Task
    m.syncTask = createObject("roSGNode", "WatchPartyTask")
    m.syncTask.operation = "get"
    m.syncTask.partyCode = m.partyCode
    m.syncTask.observeField("result", "onSyncResult")
    m.syncTask.control = "RUN"
end sub

sub onSyncResult()
    result = m.syncTask.result

    if result <> invalid and result.success = true and result.party <> invalid
        party = result.party

        ' Sync playback state
        if party.status = "playing" then
            if m.videoPlayer.state <> "playing" then
                m.videoPlayer.control = "play"
            end if

            ' Check for drift and sync if > 3 seconds
            drift = abs(m.videoPlayer.position - party.currentTime)
            if drift > 3 then
                m.videoPlayer.seek = party.currentTime
                print "Synced playback: drift was " + drift.toStr() + " seconds"
            end if
        else if party.status = "paused" then
            if m.videoPlayer.state = "playing" then
                m.videoPlayer.control = "pause"
            end if
        end if

        ' If host, update party state with current time
        if m.isPartyHost and m.videoPlayer.state = "playing"
            updatePartyState("playing", m.videoPlayer.position)
        end if
    end if
end sub

sub updatePartyState(status as String, currentTime as Integer)
    ' Host updates party state using Task
    m.updateTask = createObject("roSGNode", "WatchPartyTask")
    m.updateTask.operation = "update"
    m.updateTask.partyCode = m.partyCode
    m.updateTask.status = status
    m.updateTask.currentTime = currentTime
    m.updateTask.control = "RUN"
end sub
