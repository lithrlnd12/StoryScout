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
        ' Open star rating overlay
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
