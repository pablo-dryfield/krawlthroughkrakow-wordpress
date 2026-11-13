$PublisherArguments = @($args)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
if ($PublisherArguments -notcontains '--publish') {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'publish-seo-discovery.py')) + $PublisherArguments)
    exit $KtkNativeExitCode
}
$securePassword = Import-Clixml -LiteralPath (Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml')
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@((Join-Path $PSScriptRoot 'publish-seo-discovery.py')) + $PublisherArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
