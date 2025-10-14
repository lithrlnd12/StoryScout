sub init()
    m.top.functionName = "executeWatchPartyOperation"
end sub

' Main entry point - runs on background thread
sub executeWatchPartyOperation()
    operation = m.top.operation

    if operation = "create"
        createWatchParty()
    else if operation = "join"
        joinWatchParty()
    else if operation = "get"
        getWatchParty()
    else if operation = "update"
        updateWatchParty()
    else
        m.top.error = "Invalid operation: " + operation
    end if
end sub

' Generate a 6-character join code (uppercase letters and numbers, no confusing chars)
function generateJoinCode() as String
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = ""
    for i = 0 to 5
        randomIndex = Rnd(Len(chars)) - 1
        code = code + Mid(chars, randomIndex, 1)
    end for
    return code
end function

' Create a new watch party via Cloud Function
sub createWatchParty()
    userId = m.top.userId
    displayName = m.top.displayName
    contentId = m.top.contentId
    contentTitle = m.top.contentTitle
    videoUrl = m.top.videoUrl

    ' Validate inputs
    if userId = "" or contentId = "" or videoUrl = ""
        m.top.error = "Missing required fields for creating watch party"
        return
    end if

    ' Create HTTP request
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetUrl("https://us-central1-story-scout.cloudfunctions.net/createWatchParty")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.AddHeader("Content-Type", "application/json")
    request.SetRequest("POST")

    ' Build JSON manually to preserve camelCase (FormatJson converts to lowercase)
    jsonBody = "{"
    jsonBody = jsonBody + """userId"":""" + userId + ""","
    jsonBody = jsonBody + """displayName"":""" + displayName + ""","
    jsonBody = jsonBody + """platform"":""roku"","
    jsonBody = jsonBody + """contentId"":""" + contentId + ""","
    jsonBody = jsonBody + """contentTitle"":""" + contentTitle + ""","
    jsonBody = jsonBody + """videoUrl"":""" + videoUrl + """"
    jsonBody = jsonBody + "}"

    print "Creating watch party with body: "; jsonBody

    ' Make the request (this runs on background thread, so no UI freeze)
    if not request.AsyncPostFromString(jsonBody)
        m.top.error = "Failed to initiate request"
        return
    end if

    ' Wait for response
    event = wait(30000, port)
    if type(event) = "roUrlEvent"
        responseCode = event.GetResponseCode()
        print "HTTP Response Code: "; responseCode

        if responseCode <> 200
            m.top.error = "HTTP Error: " + responseCode.toStr()
            return
        end if

        response = event.GetString()
        print "Response body: "; response
    else
        m.top.error = "Request timeout or failed"
        return
    end if

    if response = "" or response = invalid
        m.top.error = "Failed to create watch party: No response from server"
        return
    end if

    ' Parse response
    responseObj = ParseJson(response)

    if responseObj = invalid
        m.top.error = "Failed to parse server response"
        return
    end if

    if responseObj.error <> invalid
        m.top.error = "Server error: " + responseObj.error
        return
    end if

    ' Success! Return the party data
    m.top.result = {
        success: true,
        party: responseObj.party,
        code: responseObj.party.code
    }

    print "Watch party created successfully! Code: "; responseObj.party.code
end sub

' Join an existing watch party
sub joinWatchParty()
    code = m.top.joinCode
    userId = m.top.userId
    displayName = m.top.displayName

    ' Validate inputs
    if code = "" or userId = ""
        m.top.error = "Missing required fields for joining watch party"
        return
    end if

    ' Create HTTP request
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetUrl("https://us-central1-story-scout.cloudfunctions.net/joinWatchParty")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.AddHeader("Content-Type", "application/json")
    request.SetRequest("POST")

    ' Build JSON manually to preserve camelCase (FormatJson converts to lowercase)
    jsonBody = "{"
    jsonBody = jsonBody + """code"":""" + code + ""","
    jsonBody = jsonBody + """userId"":""" + userId + ""","
    jsonBody = jsonBody + """displayName"":""" + displayName + ""","
    jsonBody = jsonBody + """platform"":""roku"""
    jsonBody = jsonBody + "}"

    print "Joining watch party with code: "; code

    ' Make the request (this runs on background thread, so no UI freeze)
    if not request.AsyncPostFromString(jsonBody)
        m.top.error = "Failed to initiate request"
        return
    end if

    ' Wait for response
    event = wait(30000, port)
    if type(event) = "roUrlEvent"
        responseCode = event.GetResponseCode()
        print "HTTP Response Code: "; responseCode

        if responseCode <> 200
            m.top.error = "HTTP Error: " + responseCode.toStr()
            return
        end if

        response = event.GetString()
        print "Response body: "; response
    else
        m.top.error = "Request timeout or failed"
        return
    end if

    if response = "" or response = invalid
        m.top.error = "Failed to join watch party: No response from server"
        return
    end if

    ' Parse response
    responseObj = ParseJson(response)

    if responseObj = invalid
        m.top.error = "Failed to parse server response"
        return
    end if

    if responseObj.error <> invalid
        m.top.error = "Server error: " + responseObj.error
        return
    end if

    ' Success! Return the party data
    m.top.result = {
        success: true,
        party: responseObj.party,
        code: responseObj.party.code
    }

    print "Joined watch party successfully! Code: "; responseObj.party.code
end sub

' Get watch party state (for polling)
sub getWatchParty()
    code = m.top.partyCode

    if code = ""
        m.top.error = "Missing party code"
        return
    end if

    ' Create HTTP request
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetUrl("https://us-central1-story-scout.cloudfunctions.net/getWatchParty?code=" + code)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")

    ' Make async GET request
    if not request.AsyncGetToString()
        m.top.error = "Failed to initiate request"
        return
    end if

    ' Wait for response
    event = wait(30000, port)
    if type(event) = "roUrlEvent"
        responseCode = event.GetResponseCode()

        if responseCode <> 200
            m.top.error = "HTTP Error: " + responseCode.toStr()
            return
        end if

        response = event.GetString()
    else
        m.top.error = "Request timeout or failed"
        return
    end if

    if response = "" or response = invalid
        m.top.error = "Failed to get watch party: No response from server"
        return
    end if

    ' Parse response
    responseObj = ParseJson(response)

    if responseObj = invalid
        m.top.error = "Failed to parse server response"
        return
    end if

    if responseObj.error <> invalid
        m.top.error = "Server error: " + responseObj.error
        return
    end if

    ' Success! Return the party data
    m.top.result = {
        success: true,
        party: responseObj.party
    }
end sub

' Update watch party state (for host)
sub updateWatchParty()
    code = m.top.partyCode
    status = m.top.status
    currentTime = m.top.currentTime

    if code = ""
        m.top.error = "Missing party code"
        return
    end if

    ' Create HTTP request
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetUrl("https://us-central1-story-scout.cloudfunctions.net/updateWatchPartyState")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.AddHeader("Content-Type", "application/json")
    request.SetRequest("POST")

    ' Build JSON manually to preserve camelCase
    jsonBody = "{"
    jsonBody = jsonBody + """code"":""" + code + ""","
    jsonBody = jsonBody + """status"":""" + status + ""","
    jsonBody = jsonBody + """currentTime"":" + currentTime.toStr()
    jsonBody = jsonBody + "}"

    ' Make async request
    if not request.AsyncPostFromString(jsonBody)
        m.top.error = "Failed to initiate request"
        return
    end if

    ' Wait for response
    event = wait(30000, port)
    if type(event) = "roUrlEvent"
        responseCode = event.GetResponseCode()

        if responseCode <> 200
            m.top.error = "HTTP Error: " + responseCode.toStr()
            return
        end if

        response = event.GetString()
    else
        m.top.error = "Request timeout or failed"
        return
    end if

    if response = "" or response = invalid
        m.top.error = "Failed to update watch party: No response from server"
        return
    end if

    ' Parse response
    responseObj = ParseJson(response)

    if responseObj = invalid
        m.top.error = "Failed to parse server response"
        return
    end if

    if responseObj.error <> invalid
        m.top.error = "Server error: " + responseObj.error
        return
    end if

    ' Success!
    m.top.result = {
        success: true
    }
end sub
