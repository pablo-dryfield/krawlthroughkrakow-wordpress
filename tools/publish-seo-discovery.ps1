$PublisherArguments = @($args)
$ErrorActionPreference = 'Stop'
if ($PublisherArguments -notcontains '--publish') {
    & python (Join-Path $PSScriptRoot 'publish-seo-discovery.py') @PublisherArguments
    exit $LASTEXITCODE
}
$securePassword = Import-Clixml -LiteralPath (Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml')
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    & python (Join-Path $PSScriptRoot 'publish-seo-discovery.py') @PublisherArguments
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
