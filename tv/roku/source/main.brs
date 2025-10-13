sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("MainScene")
    screen.show()

    ' Load content from JSON
    contentArray = LoadContentFromJSON()

    ' Pass content to scene
    scene.contentData = contentArray

    while true
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub

function LoadContentFromJSON() as Object
    ' Read the bundled JSON file
    jsonString = ReadAsciiFile("pkg:/source/archive-content.json")

    if jsonString = "" then
        return []
    end if

    contentArray = ParseJson(jsonString)

    if contentArray = invalid or type(contentArray) <> "roArray" then
        return []
    end if

    return contentArray
end function
