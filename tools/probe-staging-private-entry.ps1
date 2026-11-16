[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $EntryProbeArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if ($EntryProbeArguments -notcontains '--probe-staging') {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'probe-staging-private-entry.py')) + $EntryProbeArguments)
    exit $KtkNativeExitCode
}
$entryCredentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$entrySecurePassword = Import-Clixml -LiteralPath $entryCredentialPath
$entryPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($entrySecurePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($entryPasswordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'probe-staging-private-entry.py')) + $EntryProbeArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($entryPasswordPointer)
}
