function Invoke-KtkNativeCommand {
    param(
        [Parameter(Mandatory = $true)][string] $Command,
        [string[]] $Arguments = @()
    )
    $application = Get-Command $Command -CommandType Application -ErrorAction Stop
    $previousPreference = $ErrorActionPreference
    $script:KtkNativeExitCode = 1
    $global:LASTEXITCODE = 1
    try {
        # Windows PowerShell otherwise treats redirected native progress stderr as fatal.
        $ErrorActionPreference = 'Continue'
        & $application.Source @Arguments
        $script:KtkNativeExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}
