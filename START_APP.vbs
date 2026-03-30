Dim shell, rootPath, batPath

Set shell = CreateObject("WScript.Shell")

rootPath = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
batPath = rootPath & "START.bat"

' 1 = show your single controller terminal
shell.Run """" & batPath & """", 1, False