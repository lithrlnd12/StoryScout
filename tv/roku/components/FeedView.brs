sub init()
    print "=== FeedView init() ==="
    m.top.setFocus(true)

    ' Get references to UI elements
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.genreLabel = m.top.findNode("genreLabel")
    m.titleLabel = m.top.findNode("titleLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.likeCount = m.top.findNode("likeCount")
    m.reviewCount = m.top.findNode("reviewCount")
    m.shareCount = m.top.findNode("shareCount")

    print "UI elements found: video=" + (m.videoPlayer <> invalid).toStr()

    ' Get global content data
    m.global = m.top.getGlobalNode()
    m.contentData = m.global.contentData

    if m.contentData <> invalid
        print "Content data in FeedView: " + type(m.contentData) + " count=" + m.contentData.count().toStr()
    else
        print "ERROR: Content data is invalid in FeedView"
    end if

    ' Initialize current index
    m.currentIndex = 0

    ' Load first video
    if m.contentData <> invalid and m.contentData.count() > 0
        print "Loading first video..."
        loadVideo(m.currentIndex)
    else
        print "ERROR: Cannot load video - no content data"
    end if

    ' Observe video state
    m.videoPlayer.observeField("state", "onVideoStateChanged")
end sub

' Load video at specified index
sub loadVideo(index as Integer)
    if m.contentData = invalid or m.contentData.count() = 0
        return
    end if

    ' Wrap around if needed
    if index >= m.contentData.count()
        index = 0
    else if index < 0
        index = m.contentData.count() - 1
    end if

    m.currentIndex = index
    item = m.contentData[index]

    ' Update UI with video info
    m.genreLabel.text = item.genre
    m.titleLabel.text = item.title

    ' Truncate synopsis to fit
    synopsis = item.synopsis
    if synopsis.len() > 100
        synopsis = synopsis.left(100) + "..."
    end if
    m.synopsisLabel.text = synopsis

    ' Update engagement counts
    m.likeCount.text = formatCount(item.likes)
    m.reviewCount.text = formatCount(item.reviews)
    m.shareCount.text = formatCount(item.shares)

    ' Create content node for video player
    videoContent = createObject("roSGNode", "ContentNode")
    videoContent.url = item.trailerVideoId  ' Direct MP4 URL from Internet Archive
    videoContent.streamFormat = "mp4"

    ' Set video content and play
    m.videoPlayer.content = videoContent
    m.videoPlayer.control = "play"

    print "Loading video: " + item.title + " (" + item.trailerVideoId + ")"
end sub

' Format engagement counts (e.g., 1234 → 1.2K)
function formatCount(count as Integer) as String
    if count >= 1000
        countK = Int(count / 100) / 10.0
        return countK.toStr() + "K"
    end if
    return count.toStr()
end function

' Handle video state changes
sub onVideoStateChanged()
    state = m.videoPlayer.state
    print "Video state: " + state

    if state = "error"
        print "Video playback error"
        ' Try next video
        loadVideo(m.currentIndex + 1)
    else if state = "finished"
        ' Loop current video (trailer should already loop, but just in case)
        m.videoPlayer.control = "play"
    end if
end sub

' Handle key presses (Up/Down to navigate, OK to watch full)
function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "down"
            ' Next video
            loadVideo(m.currentIndex + 1)
            return true
        else if key = "up"
            ' Previous video
            loadVideo(m.currentIndex - 1)
            return true
        else if key = "OK"
            ' Watch full video
            playFullVideo()
            return true
        end if
    end if
    return false
end function

' Play full video in fullscreen
sub playFullVideo()
    if m.contentData = invalid or m.currentIndex >= m.contentData.count()
        return
    end if

    item = m.contentData[m.currentIndex]

    ' Create full screen video player
    fullVideoPlayer = CreateObject("roSGNode", "Video")
    fullVideoPlayer.translation = [0, 0]
    fullVideoPlayer.width = 1920
    fullVideoPlayer.height = 1080
    fullVideoPlayer.loop = false
    fullVideoPlayer.mute = false
    fullVideoPlayer.enableUI = true

    ' Create content for full video
    videoContent = createObject("roSGNode", "ContentNode")
    videoContent.url = item.fullContentVideoId  ' Full video URL
    videoContent.streamFormat = "mp4"
    videoContent.title = item.title

    fullVideoPlayer.content = videoContent
    fullVideoPlayer.control = "play"

    ' Add to scene (this will cover the feed)
    m.top.appendChild(fullVideoPlayer)
    m.fullVideoPlayer = fullVideoPlayer

    print "Playing full video: " + item.title
end sub
