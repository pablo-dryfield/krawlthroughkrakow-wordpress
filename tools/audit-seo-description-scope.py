"""Compare generated page definitions structurally with the pre-batch Git checkpoint."""
import argparse
import json
import subprocess
import tempfile
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASELINE='dc22fa6c03734644ccde3f2ce725f2900151ff61'
PREFIX='staging/wp-content/mu-plugins/ktk-code-pages-assets/'


def description_only(before,after):
    return before.get('description')!=after.get('description') and {key:value for key,value in before.items() if key!='description'}=={key:value for key,value in after.items() if key!='description'}


def git(*args):return subprocess.run(['git',*args],cwd=ROOT,capture_output=True,check=True).stdout


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True);args=parser.parse_args()
    output=ROOT/args.output
    if output.exists():raise RuntimeError('Preserve prior scope proof; choose a new filename')
    old=json.loads(git('show',BASELINE+':tools/code-pages-seo.json'))
    current=json.loads((ROOT/'tools/code-pages-seo.json').read_text())
    manifest=json.loads((ROOT/'docs/code-pages/full-migration/manifest.json').read_text())
    expected={PREFIX+'pages/'+row['key']+'.php' for row in manifest['routes'] if row['route'] in current['pages'] and row['route'] not in old['pages']}
    changed=set(git('diff','--name-only',BASELINE,'--',PREFIX).decode().splitlines())
    if changed!=expected:raise RuntimeError('Only the explicitly reviewed additional page definitions may change')
    with tempfile.TemporaryDirectory(prefix='ktk-description-scope-') as directory:
        temporary=Path(directory).resolve()
        if not temporary.is_relative_to(Path(tempfile.gettempdir()).resolve()):raise RuntimeError('Unexpected temporary fixture root')
        for name in sorted(changed):(temporary/Path(name).name).write_bytes(git('show',BASELINE+':'+name))
        code="define('ABSPATH','.');$r=array();foreach(glob($argv[1].'/*.php') as $f){$name=basename($f);$r[$name]=array('before'=>require $f,'after'=>require $argv[2].'/'.$name);}echo json_encode($r);"
        rows=json.loads(subprocess.run(['php','-r',code,str(temporary),str(ROOT/PREFIX/'pages')],cwd=ROOT,capture_output=True,check=True).stdout)
    bad=[name for name,row in rows.items() if not description_only(row['before'],row['after'])]
    if bad:raise RuntimeError('A generated field other than description changed: '+','.join(bad))
    report={'checkedAt':datetime.now(timezone.utc).isoformat(),'baseline':BASELINE,'changedDefinitions':len(rows),'descriptionOnly':True,
            'otherCodePageAssetsUnchanged':True,'reviewedDescriptions':len(current['pages']),'holds':current.get('holds',{}),'files':sorted(changed)}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:report[key] for key in ('changedDefinitions','descriptionOnly','otherCodePageAssetsUnchanged','reviewedDescriptions','holds')}))
