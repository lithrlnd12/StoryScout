sub init()
    m.top.setFocus(true)

    ' Get UI elements
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.genreRow = m.top.findNode("genreRow")
    m.genreRowBg = m.top.findNode("genreRowBg")
    m.genreLabel = m.top.findNode("genreLabel")
    m.titleLabel = m.top.findNode("titleLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.likeCount = m.top.findNode("likeCount")
    m.ratingText = m.top.findNode("ratingText")
    m.shareCount = m.top.findNode("shareCount")
    m.statusLabel = m.top.findNode("statusLabel")
    m.bottomCard = m.top.findNode("bottomCard")
    m.engagementBar = m.top.findNode("engagementBar")
    m.navHint = m.top.findNode("navHint")

    ' Watch Party UI elements
    m.watchPartyOverlay = m.top.findNode("watchPartyOverlay")
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

    ' Firebase Cloud Functions base URL
    m.apiBaseUrl = "https://us-central1-story-scout.cloudfunctions.net"

    ' Message port for async HTTP requests
    m.port = createObject("roMessagePort")
    m.top.observeField("port", "onHttpResponse")

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

    ' Update engagement counts
    m.likeCount.text = formatCount(item.likes)
    ' Rating text is static "Rate" - no need to update
    m.shareCount.text = formatCount(item.shares)

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

    ' Show bottom card and engagement bar
    m.bottomCard.visible = true
    m.engagementBar.visible = true

    m.videoPlayer.observeField("state", "onVideoState")
end sub

sub onVideoState()
    state = m.videoPlayer.state
    if state = "error"
        m.statusLabel.text = "Video Error"
        m.statusLabel.visible = true
    end if
end sub

function formatCount(count as Integer) as String
    if count >= 1000
        countK = Int(count / 100) / 10.0
        return countK.toStr() + "K"
    end if
    return count.toStr()
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

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
    else if key = "options" or key = "*" then
        ' Open watch party menu
        openWatchPartyMenu()
        return true
    else if key = "replay" then
        ' Open star rating overlay (moved from options key)
        openStarRating()
        return true
    else if key = "OK" then
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
    m.engagementBar.visible = false
    m.navHint.visible = false
end sub

sub showAllUI()
    m.genreRowBg.visible = true
    m.genreRow.visible = true
    m.bottomCard.visible = true
    m.engagementBar.visible = true
    m.navHint.visible = true
end sub

sub openStarRating()
    ' TODO: Implement star rating overlay
    ' For now, just show a simple message
    m.statusLabel.text = "Star Rating Coming Soon!"
    m.statusLabel.visible = true

    ' Hide status after 2 seconds
    m.ratingTimer = createObject("roSGNode", "Timer")
    m.ratingTimer.duration = 2
    m.ratingTimer.repeat = false
    m.ratingTimer.observeField("fire", "hideRatingMessage")
    m.ratingTimer.control = "start"
end sub

sub hideRatingMessage()
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
            ' Join Party - TODO: Show keyboard
            closeWatchPartyMenu()
            m.statusLabel.text = "Join Party - Keyboard Coming Soon!"
            m.statusLabel.visible = true
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

    ' Temporary: Just generate local code for testing
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = ""
    for i = 0 to 5
        randomIndex = Int(Rnd(0) * chars.len())
        code = code + Mid(chars, randomIndex, 1)
    end for

    m.partyCode = code
    m.isPartyHost = true
    m.watchPartyActive = true
    m.statusLabel.text = "Party Code: " + m.partyCode
    m.statusLabel.visible = true
    print "Created watch party with code: " + m.partyCode

    ' TODO: Re-enable Firebase integration after fixing UI freeze
end sub

sub checkCreateResponse()
    msg = m.port.getMessage()
    if msg <> invalid and type(msg) = "roUrlEvent"
        m.createTimer.control = "stop"
        responseCode = msg.GetResponseCode()
        if responseCode = 200
            responseStr = msg.GetString()
            response = ParseJson(responseStr)
            if response <> invalid and response.success = true and response.code <> invalid
                m.partyCode = response.code
                m.isPartyHost = true
                m.watchPartyActive = true
                m.statusLabel.text = "Party Code: " + m.partyCode
                m.statusLabel.visible = true
                print "Created watch party with code: " + m.partyCode
            else
                m.statusLabel.text = "Failed to create party"
                m.statusLabel.visible = true
            end if
        else
            m.statusLabel.text = "Network Error: " + responseCode.toStr()
            m.statusLabel.visible = true
        end if
    end if
end sub

sub joinWatchParty(code as String)
    ' Show joining message
    m.statusLabel.text = "Joining party..."
    m.statusLabel.visible = true

    ' Create HTTP request to Firebase Cloud Function (async, non-blocking)
    request = createObject("roUrlTransfer")
    request.SetUrl(m.apiBaseUrl + "/joinWatchParty")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.InitClientCertificates()
    request.EnablePeerVerification(false)
    request.EnableHostVerification(false)
    request.AddHeader("Content-Type", "application/json")

    ' Generate unique user ID for Roku (using device ID)
    deviceInfo = createObject("roDeviceInfo")
    userId = "roku_" + deviceInfo.GetChannelClientId()

    ' Prepare request body
    body = {
        code: code,
        userId: userId,
        displayName: "Roku User",
        platform: "roku"
    }

    ' Send async request (non-blocking)
    request.SetMessagePort(m.port)
    m.joinRequest = request
    if request.AsyncPostFromString(FormatJson(body))
        print "Watch party join request sent for code: " + code
        ' Timer to check response
        m.joinTimer = createObject("roSGNode", "Timer")
        m.joinTimer.duration = 0.5
        m.joinTimer.repeat = true
        m.joinTimer.observeField("fire", "checkJoinResponse")
        m.joinTimer.control = "start"
    else
        m.statusLabel.text = "Failed to send request"
        m.statusLabel.visible = true
    end if
end sub

sub checkJoinResponse()
    msg = m.port.getMessage()
    if msg <> invalid and type(msg) = "roUrlEvent"
        m.joinTimer.control = "stop"
        responseCode = msg.GetResponseCode()
        if responseCode = 200
            responseStr = msg.GetString()
            response = ParseJson(responseStr)
            if response <> invalid and response.success = true
                m.partyCode = response.party.code
                m.isPartyHost = false
                m.watchPartyActive = true
                m.statusLabel.text = "Joined party: " + m.partyCode
                m.statusLabel.visible = true
                print "Joined watch party: " + m.partyCode
            else
                m.statusLabel.text = "Party not found"
                m.statusLabel.visible = true
            end if
        else if responseCode = 404
            m.statusLabel.text = "Party not found"
            m.statusLabel.visible = true
        else
            m.statusLabel.text = "Network Error: " + responseCode.toStr()
            m.statusLabel.visible = true
        end if
    end if
end sub
