<?php
/** Validate retained private artifacts against exact known engine write bytes. */
if (!defined('KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED') || KTK_PRIVATE_ENGINE_ABANDONMENT_INSPECTION_ALLOWED!==true) {
    throw new RuntimeException('Explicit private artifact inspection required');
}
final class KTK_Private_Engine_Abandonment_Artifacts
{
    private static function prefix(string $path,array $row): bool
    {
        clearstatcache(true,$path);$before=@lstat($path);
        if(is_link($path)||!is_file($path)||$before===false||($before['nlink']??0)!==1||$row['bytes']>$before['size']){return false;}
        $h=fopen($path,'rb');if(!$h){throw new RuntimeException('Known private prefix source unreadable');}
        try{
            $held=fstat($h);if($held===false||$held['dev']!==$before['dev']||$held['ino']!==$before['ino']||$held['size']!==$before['size']){throw new RuntimeException('Known prefix source changed while opening');}
            $hash=hash_init('sha256');$count=$row['bytes']===0?0:hash_update_stream($hash,$h,$row['bytes']);
            $after=fstat($h);clearstatcache(true,$path);$current=@lstat($path);
            if($count!==$row['bytes']||$after===false||$current===false||is_link($path)||$after['dev']!==$before['dev']||$after['ino']!==$before['ino']||$after['size']!==$before['size']||$current['dev']!==$before['dev']||$current['ino']!==$before['ino']||$current['size']!==$before['size']||($current['nlink']??0)!==1){throw new RuntimeException('Known prefix source changed while reading');}
            return hash_final($hash)===$row['sha256'];
        }finally{fclose($h);}
    }
    private static function successor(array $journal,string $phase,?string $event=null,?string $add=null,?string $remove=null): string
    {
        $journal['phase']=$phase;
        if($add!==null){$journal['intents'][$add]=true;}
        if($remove!==null){unset($journal['intents'][$remove]);}
        if($event!==null){$journal['events'][]=$event;}
        // Exact frozen engine serialization, including array insertion order.
        return json_encode($journal,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\n";
    }
    private static function receiptCandidates(array $plan,array $journal,array $actual): array
    {
        $out=array();$phase=$journal['phase'];
        if(in_array($phase,array('prepared','applying','uncertain','applied'),true)){$out[]=self::successor($journal,'applying');}
        if(in_array($phase,array('prepared','applying','uncertain','applied','rolling-back'),true)){$out[]=self::successor($journal,'rolling-back');}
        if($phase==='applying'){
            $out[]=self::successor($journal,'uncertain','interruption-inspect-before-recovery');
            foreach($plan['expected'] as $name=>$hash){
                if($hash===($plan['prior'][$name]??null)){continue;}
                if(!isset($journal['intents'][$name])&&($actual[$name]??null)===($plan['prior'][$name]??null)){$out[]=self::successor($journal,'applying','intent:'.$name,$name);}
                if(isset($journal['intents'][$name])&&($actual[$name]??null)===$hash){$out[]=self::successor($journal,'applying','installed:'.$name);}
                if(isset($journal['intents'][$name])&&($actual[$name]??null)===($plan['prior'][$name]??null)){$out[]=self::successor($journal,'applying','cancelled-before-replacement:'.$name,null,$name);}
            }
            $expected=$plan['expected']+array('ktk-code-pages-production.php'=>$plan['prior']['ktk-code-pages-production.php']);ksort($expected);
            if($actual===$expected){$out[]=self::successor($journal,'applied','complete-owned-hashes-and-protected-state-verified');}
        }
        if($phase==='rolling-back'){
            foreach($journal['intents'] as $name=>$value){if(($actual[$name]??null)===($plan['prior'][$name]??null)){$out[]=self::successor($journal,'rolling-back','restored:'.$name);}}
            $prior=$plan['prior'];ksort($prior);if($actual===$prior){$out[]=self::successor($journal,'rolled-back','exact-prior-inventory-and-retained-activation-verified');}
        }
        if($phase==='applying'){
            // apply() can fail while writing an intent/install/cancel/final
            // receipt, then try exactly one failure receipt from that same
            // in-memory journal. A cut in that catch leaves both prefixes.
            // Do not accept arbitrary event chains or a third transition.
            $first=$out;
            foreach($first as $bytes){
                $next=json_decode($bytes,true,512,JSON_THROW_ON_ERROR);
                if(in_array($next['phase'],array('applying','applied'),true)&&count($next['events'])===count($journal['events'])+1){$out[]=self::successor($next,'uncertain','interruption-inspect-before-recovery');}
            }
        }
        return array_values(array_unique($out));
    }
    public static function inspect(string $root,string $engine,array $plan,array $journal,array $actual,array $files,array $view): array
    {
        $known=array();$bindings=$journal['intents'];
        foreach($journal['events'] as $event){foreach(array('intent:','cancelled-before-replacement:') as $prefix){if(str_starts_with($event,$prefix)){$bindings[substr($event,strlen($prefix))]=true;}}}
        $pending=$view['retainedPrivateTemporaryArtifacts'];$receipts=$view['retainedPrivateReceiptArtifacts'];
        if(!is_array($pending)||!is_array($receipts)||count($pending)>100||count($receipts)>100){throw new RuntimeException('Bounded known retained artifacts required');}
        foreach($pending as $name=>$row){
            if(!preg_match('/^\.ktk-content-[a-f0-9]{32}$/D',$name)){throw new RuntimeException('Unknown private temporary name preserved');}
            $key=$engine.'/pending/'.$name;if(($files[$key]??null)!==$row){throw new RuntimeException('Private temporary census differs');}
            $matches=array();
            foreach($bindings as $logical=>$value){
                if(!isset($plan['expected'][$logical])||$plan['expected'][$logical]===($plan['prior'][$logical]??null)){continue;}
                if(self::prefix($root.'/source/'.$logical,$row)){$matches[]='candidate:'.$logical;}
                if(isset($plan['prior'][$logical])&&self::prefix($root.'/'.$engine.'/prior/'.$logical,$row)){$matches[]='prior:'.$logical;}
            }
            if($matches===array()){throw new RuntimeException('Changed private temporary prefix preserved');}
            $known[$key]=array('kind'=>'known-content-prefix','possibleBindings'=>$matches);
        }
        $candidates=self::receiptCandidates($plan,$journal,$actual);
        foreach($receipts as $name=>$row){
            if(!preg_match('/^\.ktk-receipt-journal-[a-f0-9]{32}$/D',$name)){throw new RuntimeException('Unknown active receipt name preserved');}
            $key=$engine.'/receipts/'.$name;if(($files[$key]??null)!==$row){throw new RuntimeException('Private receipt census differs');}
            $matches=array();foreach($candidates as $bytes){if($row['bytes']<=strlen($bytes)&&hash('sha256',substr($bytes,0,$row['bytes']))===$row['sha256']){$matches[]=hash('sha256',$bytes);}}
            if($matches===array()){throw new RuntimeException('Changed or unsupported private receipt preserved');}
            $known[$key]=array('kind'=>'known-next-journal-prefix','possibleSuccessorSha256'=>array_values(array_unique($matches)));
        }
        ksort($known);return $known;
    }
}
